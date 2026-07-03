# Frontend Component Specification

This document outlines the architecture, styling, and logic engine driving the CEDX Next.js frontend shell.

---

## Architecture Overview
- **Framework:** Next.js (App Router paradigm).
- **Type Definitions:** Housed securely in `/types/audit.ts`, mirroring the Pydantic schemas dictated by the backend API to ensure type-safe data hydration across the wire.
- **Routing:** A strictly single-page dashboard shell implemented in `/app/page.tsx` pulling layouts from `/app/layout.tsx`.

---

## Design System & Styling
The application utilizes a Premium Light-Themed Design Paradigm optimized for data density and observability.

- **Tokens:** Configured in `tailwind.config.js`. Focuses heavily on Slate (`slate-900` for typography, `slate-500` for metadata) and Indigo (`indigo-600`) as primary accents. 
- **Layouts:** Employs precise Flexbox columns for vertical pipelines and CSS Grids for scannable telemetry data blocks.
- **Component Styling:** Grid matrices use crisp lines, 1px border dividers (`divide-slate-100`), pure white elevated cards (`bg-white shadow-sm`), and soft backdrop foundations (`bg-[#fafafa]`).

---

## Client-Side Fetch API State Engine
- **Telemetry Polling:** The main component uses a `useEffect` interval loop to poll `GET /api/status` and `GET /api/records` every 5 seconds. This continuously hydrates the UI state variables without requiring manual refresh.
- **Agent Trace Timeline:** A bespoke vertical component parses the `agent_trace` span log attached to each record. It maps the timeline dynamically, applying conditional formatting (emerald for Verifier passes, red blocks for `AGENT_HALLUCINATION`) based on the execution metrics and verdict.
- **Live Amendment Interceptor:** A front-end state interceptor explicitly blocks the "Approve System Delivery" button if a high-value item (Amount $\ge$ Threshold T) is interacted with by an unauthorized role. It halts the `fetch` dispatch, preventing a 403 network hit, and instead elegantly displays a local warning modal.
