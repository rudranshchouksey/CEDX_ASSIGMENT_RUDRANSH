# CEDX System Architecture Decision Log

## 1. FastAPI for Backend Orchestration
**Context**: We needed a backend capable of handling multi-agent workflows, type validation, and strict isolation from the UI.
**Decision**: Use Python and FastAPI.
**Reason**: Python's ecosystem is unparalleled for LLM orchestration and data validation. FastAPI's Pydantic integration enforces our rigid JSON contracts naturally. It allows a truly decoupled architecture from the Next.js frontend, executing the agent loop synchronously or easily migrating to an async worker queue.

## 2. Next.js App Router for Frontend
**Context**: We required a hyper-premium, data-dense observability UI.
**Decision**: Use Next.js App Router and React Server Components.
**Reason**: Next.js provides excellent routing primitives and server-side rendering, although we treat it heavily as a client-side SPA fetching from the backend. The border-driven light theme utilizing Tailwind CSS ensures visual fidelity matching top-tier developer tools.

## 3. Median Absolute Deviation (MAD) for Outlier Verification
**Context**: We needed a robust anomaly detection algorithm that generalizes to unseen seeded datasets without hardcoded limits.
**Decision**: Implement the Modified Z-score method using MAD.
**Reason**: Unlike standard deviation, MAD is robust to skewed distributions and is resistant to masking by multiple outliers. This mathematically rigorous approach ensures the agent fleet correctly flags outliers without being brittle to specific data sets.

## 4. Pure SHA-256 Amendment Gate
**Context**: We need to securely authorize delivery of high-value payloads based on a deterministic `$CASE_ID`.
**Decision**: Cryptographically derive the target `Role R` and `Threshold T` using a stateless SHA-256 derivation of the lowercase UTF-8 encoded `$CASE_ID`.
**Reason**: The derivation is pure, stateless, and reproducible across any platform. It enforces a programmatic, non-bypassable security layer without requiring a database for rules storage.

## 5. Idempotent Offline Replay
**Context**: Automated grading environments require complete network isolation and exactly identical trace generations across multiple runs.
**Decision**: Cache LLM responses securely by SHA-256 hashed prompt queries (`transcripts/`). Use deterministic input IDs rather than random UUIDs.
**Reason**: Random UUID generation (`uuid.uuid4()`) inherently breaks determinism, rendering output trace hashes distinct on each run. Ensuring IDs are deterministically derived from the source bytes (`sha256(raw_bytes)`) guarantees perfect idempotency for the `audit.json` trace.
