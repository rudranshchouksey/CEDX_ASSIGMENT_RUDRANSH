"""CEDX Pipeline — Phase 1 entrypoint.

Orchestrates the three subsystems in sequence:

    1. **Amendment Core** — derive regulatory role & threshold from CASE_ID.
    2. **Intake Pipeline** — ingest feed, EML, and PDF sources into registry.
    3. **Detection Engine** — run anomaly & injection detectors over the
       registry snapshot.

Exit codes:
    * ``0`` — pipeline completed (anomalies may or may not be present).
    * ``1`` — fatal configuration or infrastructure error.
"""

from __future__ import annotations

import logging
import sys

from cedx_pipeline.amendment import Amendment, init_amendment
from cedx_pipeline.config import get_pipeline_now
from cedx_pipeline.detectors.engine import run_detectors
from cedx_pipeline.detectors.models import Anomaly
from cedx_pipeline.errors import CedxPipelineError
from cedx_pipeline.intake.pipeline import run_intake
from cedx_pipeline.intake.registry import DataRegistry

logger = logging.getLogger(__name__)


def _configure_logging() -> None:
    """Set up structured root logging to stdout."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        stream=sys.stdout,
        force=True,
    )


def _print_anomaly_report(anomalies: list[Anomaly]) -> None:
    """Emit a human-readable anomaly summary to stdout."""
    if not anomalies:
        logger.info("No anomalies detected — pipeline clean.")
        return

    logger.info("=" * 72)
    logger.info("ANOMALY REPORT — %d finding(s)", len(anomalies))
    logger.info("=" * 72)

    for idx, a in enumerate(anomalies, 1):
        logger.info(
            "  [%d] %-20s | severity=%-8s | record=%s\n"
            "       %s",
            idx,
            a.anomaly_type.value,
            a.severity,
            a.record_id,
            a.detail,
        )

    logger.info("=" * 72)


def main() -> None:
    """Top-level pipeline entrypoint.

    Designed to be called as a CLI script (``cedx-pipeline``) or via
    ``python -m cedx_pipeline.main``.
    """
    _configure_logging()
    logger.info("CEDX Pipeline Phase 1 — starting.")

    try:
        # ── 1. Cryptographic Amendment ───────────────────────────────────
        amendment: Amendment = init_amendment()
        logger.info(
            "Amendment initialised: case_id=%s role=%s threshold=%d",
            amendment.case_id,
            amendment.role,
            amendment.threshold,
        )

        # ── 2. Resilient Intake ──────────────────────────────────────────
        registry: DataRegistry = run_intake()
        logger.info("Intake complete: %d record(s) registered.", registry.count())

        # ── 3. Detection Engine ──────────────────────────────────────────
        pipeline_now = get_pipeline_now()
        anomalies: list[Anomaly] = run_detectors(registry, pipeline_now)

        # ── 4. Report ────────────────────────────────────────────────────
        _print_anomaly_report(anomalies)

        logger.info("CEDX Pipeline Phase 1 — completed successfully.")

    except CedxPipelineError as exc:
        logger.error("Pipeline failed: %s", exc)
        sys.exit(1)
    except Exception:
        logger.exception("Unexpected error in pipeline execution.")
        sys.exit(1)


if __name__ == "__main__":
    main()
