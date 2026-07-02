from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from cedx_pipeline.amendment import Amendment, init_amendment
from cedx_pipeline.governance.state_machine import ReviewStateMachine, LiveAmendmentGateError, ReviewState
from cedx_pipeline.intake.registry import Record

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CEDX Governance API")

# ── In-Memory State Mocking for Serverless Runtime ────────────────────────────

class MockState:
    def __init__(self):
        self.amendment: Amendment = None
        self.records: dict[str, dict[str, Any]] = {}
        self.events: list[dict[str, Any]] = []
        self.stats: dict[str, Any] = {
            "total_processed": 0,
            "total_cost": 0.0,
        }

state = MockState()

def bootstrap_state():
    """Load mock data or parse from out/audit.json if available locally."""
    try:
        # 1. Init amendment
        # Use a fake CASE_ID if not present, to ensure Vercel doesn't crash on boot
        if not os.environ.get("CASE_ID"):
            os.environ["CASE_ID"] = "CEDX-VERCEL-1234"
        state.amendment = init_amendment()

        # 2. Try to load from audit.json
        audit_path = Path("out/audit.json")
        if audit_path.exists():
            with open(audit_path, "r", encoding="utf-8") as f:
                audit_data = json.load(f)
            
            state.events = audit_data.get("events", [])
            state.stats["total_cost"] = audit_data.get("cost_metrics", {}).get("total_usd", 0.0)
            
            # Since audit.json doesn't store the raw records directly outside of the package payload,
            # we can reconstruct minimal record states from agent_trace or events.
            # But for a robust dashboard, let's mock some structured data if it's missing.
            
            # Let's populate some mock records based on events or inject static ones for UI purposes
            for trace_id, traces in audit_data.get("agent_trace", {}).items():
                state.records[trace_id] = {
                    "id": trace_id,
                    "state": ReviewState.APPROVED.value,
                    "amount": 50000.0, # Dummy high value
                    "reason_codes": [],
                }
                state.stats["total_processed"] += 1
                
        if not state.records:
            # Fallback mock state for Vercel
            state.records = {
                "REC-001": {"id": "REC-001", "state": ReviewState.APPROVED.value, "amount": 25000.0, "reason_codes": []},
                "REC-002": {"id": "REC-002", "state": ReviewState.CHANGES_REQUESTED.value, "amount": 100.0, "reason_codes": []},
                "REC-003": {"id": "REC-003", "state": ReviewState.IN_REVIEW.value, "amount": 500.0, "reason_codes": ["AGENT_HALLUCINATION"]},
            }
            state.stats["total_processed"] = 3
            state.stats["total_cost"] = 0.015

    except Exception as e:
        logger.error(f"Failed to bootstrap state: {e}")

bootstrap_state()


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/status")
async def get_status():
    if not state.amendment:
        return {"status": "uninitialized"}
        
    return {
        "case_id": state.amendment.case_id,
        "role": state.amendment.role,
        "threshold": state.amendment.threshold,
        "total_processed": state.stats["total_processed"],
        "total_cost": state.stats["total_cost"]
    }


@app.get("/api/records")
async def get_records():
    return list(state.records.values())


class ReviewAction(BaseModel):
    record_id: str
    actor_role: str
    action: str  # approve, reject, request_changes, deliver

@app.post("/api/review")
async def review_record(payload: ReviewAction):
    record_data = state.records.get(payload.record_id)
    if not record_data:
        raise HTTPException(status_code=404, detail="Record not found")

    # Create dummy Record for StateMachine
    dummy_record = Record(
        id=record_data["id"],
        source_format="json",
        owner="operator",
        deadline="2099-12-31",
        amount=record_data["amount"],
        notes="",
        source_version_hash="x",
        payload={}
    )
    
    # Initialize machine at current state
    machine = ReviewStateMachine(
        dummy_record, 
        state.amendment, 
        initial_state=ReviewState(record_data["state"])
    )
    
    # Load reason codes
    for rc in record_data.get("reason_codes", []):
        machine.add_reason_code(rc)

    # Perform action
    try:
        if payload.action == "approve":
            machine.add_signature(payload.actor_role, "operator_ui")
            machine.transition_to_approved()
        elif payload.action == "request_changes":
            machine.transition_to_changes_requested()
        elif payload.action == "deliver":
            # If the user clicks deliver, we must check the signatures.
            # Let's inject a signature just so we can test the Live Amendment Gate
            # We assume the 'approve' action added it. If they try to deliver 
            # with wrong role, it will fail.
            machine.add_signature(payload.actor_role, "operator_ui")
            try:
                machine.transition_to_delivered()
            except LiveAmendmentGateError as e:
                state.events.append({"event": "UNAUTHORIZED_DELIVERY_ATTEMPT", "details": str(e)})
                raise HTTPException(status_code=403, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
            
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=str(e))

    # Update state
    record_data["state"] = machine.state.value
    return {"status": "success", "record": record_data}


@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    dashboard_path = Path(__file__).parent / "dashboard.html"
    if dashboard_path.exists():
        return dashboard_path.read_text(encoding="utf-8")
    return "<h1>Dashboard UI missing</h1>"

