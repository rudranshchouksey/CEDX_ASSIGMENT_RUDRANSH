.PHONY: demo trace replay probe-approval probe-agent-failure probe-budget probe-append-only probe-idempotency test validate-e2e

demo:
	cd backend && REPLAY_LLM=true python -m cedx_pipeline.main

trace:
	@if [ -z "$(ID)" ]; then echo "Error: ID is required. Usage: make trace ID=<id>"; exit 1; fi
	cd backend && python scripts/trace.py --id $(ID)

replay:
	@if [ -z "$(ID)" ]; then echo "Error: ID is required. Usage: make replay ID=<id>"; exit 1; fi
	cd backend && python scripts/replay.py --id $(ID)

probe-approval:
	cd backend && python scripts/probe_approval.py

probe-agent-failure:
	cd backend && python scripts/probe_agent_failure.py

probe-budget:
	cd backend && python scripts/probe_budget.py

probe-append-only:
	cd backend && python scripts/probe_append_only.py

probe-idempotency:
	cd backend && python scripts/probe_idempotency.py

test:
	cd backend && pytest tests/

validate-e2e:
	python validate_system.py
