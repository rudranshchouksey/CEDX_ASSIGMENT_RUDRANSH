.PHONY: demo trace replay probe-approval probe-agent-failure probe-budget probe-append-only probe-idempotency test validate-e2e

demo:
	cd backend && $(MAKE) demo

trace:
	cd backend && $(MAKE) trace ID=$(ID)

replay:
	cd backend && $(MAKE) replay ID=$(ID)

probe-approval:
	cd backend && $(MAKE) probe-approval

probe-agent-failure:
	cd backend && $(MAKE) probe-agent-failure

probe-budget:
	cd backend && $(MAKE) probe-budget

probe-append-only:
	cd backend && $(MAKE) probe-append-only

probe-idempotency:
	cd backend && $(MAKE) probe-idempotency

test:
	cd backend && $(MAKE) test

validate-e2e:
	python validate_system.py
