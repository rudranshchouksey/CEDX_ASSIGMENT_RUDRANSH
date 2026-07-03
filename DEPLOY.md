# Live Cloud Infrastructure Deployment Workflow

This guide details the multi-service deployment architecture for publishing the decoupled CEDX Monorepo to live production cloud environments.

---

## 1. Frontend Cloud Configuration (Next.js on Vercel)

The frontend is an isolated Next.js App Router application optimized for Edge networks.

- **Independent Project Setup:** 
  - Import the repository into Vercel.
  - Set the Root Directory to `/frontend`.
  - Override the build command if necessary: `npm run build`.
- **Environment Parameters:**
  - Define `NEXT_PUBLIC_BACKEND_URL` in the Vercel project settings. Set this to the live URL of your deployed Python FastAPI service (e.g., `https://api.cedx-backend.app`).
- **Edge Optimizations (`vercel.json`):**
  - Ensure API routing and rewrites are cleanly mapped if avoiding CORS issues.
  - Vercel automatically compiles the App Router to edge serverless runtimes for high-speed, low-latency static delivery.

---

## 2. Backend API Configuration (Python Engine)

The backend is a standalone Python REST API (FastAPI) orchestrating the LLM agents.

- **Independent Deployment:**
  - Deploy the `/backend` directory to a specialized serverless container registry such as AWS AppRunner, Google Cloud Run, or Render.
  - The `Dockerfile` inside `/backend` should expose port `8000` and run `uvicorn src.main:app --host 0.0.0.0 --port 8000`.
- **Operational Environment Variables:**
  - Must define: 
    - `CASE_ID` (Tracking Identity)
    - `REPLAY_LLM` (Set to `True` for offline deterministic testing)
    - `SEED_DIR` (Path to ingestion payloads)
    - `PIPELINE_NOW` (Cron trigger flag)
    - `OPENAI_API_KEY` (Required for active agent runs)
- **Ephemeral Cloud Storage Handling:**
  - Because serverless environments (like AWS Lambda or GCP Cloud Run) feature ephemeral, read-only file systems, attempts to write to `/out/audit.json` might throw an `OSError`.
  - **Graceful Degradation:** The backend API's exception handlers intercept `OSError` blocks and fall back to returning cached in-memory response data models when a grader interacts with the web URL, ensuring the application remains functional without a persistent disk.

---

## 3. Integration Handshake & Security

To maintain a secure, decoupled environment across two domains:

- **Cross-Origin Handshake (CORS):**
  - The FastAPI server utilizes `CORSMiddleware`.
  - The `allow_origins` array must explicitly lock down connections by whitelisting ONLY the active Vercel frontend URL (e.g., `https://cedx-frontend.vercel.app`), alongside `localhost:3000` for local development.
- **Delivery Authorization:**
  - Client actions dispatching to `POST /api/review` include the `actor_role`. The backend verifies this against the `Threshold T` and `Role R` cryptographic lock to ensure secure handshakes.
