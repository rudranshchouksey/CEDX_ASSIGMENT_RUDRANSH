# CEDX System Architecture

## Overview
The CEDX system employs a highly decoupled Monorepo architecture. It is built as two distinctly isolated tiers that only communicate via well-defined REST contracts and shared cryptographic parameters.
This ensures the multi-agent backend can be deployed entirely autonomously from the Next.js frontend, enabling scale economics and strict data compliance.

## Tier 1: Next.js Frontend
- **Framework:** Next.js (App Router), React, TypeScript.
- **Styling:** Tailwind CSS (Strict zinc/border-driven light theme).
- **State Management:** Custom React hooks fetching state from `/api/status` and `/api/records`.
- **Amendment Gate:** Client-side Live Amendment Interceptor that captures high-value actions and securely evaluates role-based conditions before dispatching state transitions to the backend.

## Tier 2: Python FastAPI Backend (Agent Core)
- **Framework:** Python, FastAPI.
- **Agent Roster:** 
  - **Orchestrator:** Controls execution flow, enforces budgets (`MAX_STEPS_PER_RECORD`, `MAX_COST_USD_PER_RECORD`), and triggers agent loops.
  - **Worker:** Parses raw feeds, PDFs, and emails into strictly validated JSON schemas.
  - **Verifier:** Evaluates outputs via anomaly detection models (e.g. MAD outlier calculations). Emits verdicts (`PASS`, `FAIL`, `OVERRULE`) and traps agent failure logic (`AGENT_HALLUCINATION`, `AGENT_LOOP`, `AGENT_MALFORMED`).
- **Resilience:** Implements Vercel-friendly graceful degradation (switching to in-memory mocks on read-only environments).
- **Scale Projections:** The telemetry engine compiles scale limits and mathematically projects inference bounds for scaling to 10,000 requests.
- **Idempotency:** Utilizes strict SHA-256 fingerprinting for inputs to guarantee deterministic output across replays without relying on random seeds or UUIDs.

## The Amendment Cryptographic Gateway
- Delivery of payloads exceeding a Threshold `T` mathematically require a cryptographically enforced signature mapped to a specific `Role R`.
- Derived deterministically from the `$CASE_ID` using `SHA256`.

## Boundaries and Contracts
Typed Pydantic schemas enforce rigid JSON boundaries across the wire. The two systems duplicate these interfaces manually (e.g., `/backend/models.py` and `/frontend/types/audit.ts`) to maintain absolute structural decoupling without sharing import paths.
