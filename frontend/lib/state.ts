import { Record, EventLog, SystemStats } from '../types/audit';

class MockState {
  public records: Map<string, Record> = new Map();
  public events: EventLog[] = [];
  public stats: SystemStats = {
    total_processed: 0,
    total_cost: 0.0,
    avg_cost: 0.0,
    p95_latency: 0.0,
    replay_llm: true,
  };
  private isInitialized = false;

  public initialize() {
    if (this.isInitialized) return;

    // Hardcode fallback mock data to prevent Vercel file system issues
    const mockRecords: Record[] = [
      {
        id: "REC-001",
        state: "approved",
        amount: 25000.0,
        reason_codes: [],
        lineage: { owner: "Alice", deadline: "2026-10-31", source_format: "json", source_hash: "a1b2c3d4" },
        agent_trace: [
          { agent: "worker", model: "gemini-1.5-flash", tokens_in: 150, tokens_out: 50, cost_usd: 0.015, latency_ms: 250.0, verdict: "N/A" },
          { agent: "verifier", model: "gemini-1.5-flash", tokens_in: 200, tokens_out: 10, cost_usd: 0.02, latency_ms: 150.0, verdict: "PASS" }
        ]
      },
      {
        id: "REC-002",
        state: "changes_requested",
        amount: 100.0,
        reason_codes: [],
        lineage: { owner: "Bob", deadline: "2026-11-15", source_format: "pdf", source_hash: "f9e8d7c6" },
        agent_trace: [
          { agent: "worker", model: "gemini-1.5-flash", tokens_in: 500, tokens_out: 100, cost_usd: 0.05, latency_ms: 400.0, verdict: "N/A" }
        ]
      },
      {
        id: "REC-003",
        state: "in_review",
        amount: 500.0,
        reason_codes: ["AGENT_HALLUCINATION"],
        lineage: { owner: "Charlie", deadline: "2026-12-01", source_format: "eml", source_hash: "deadbeef" },
        agent_trace: [
          { agent: "worker", model: "gemini-1.5-pro", tokens_in: 1000, tokens_out: 200, cost_usd: 0.15, latency_ms: 800.0, verdict: "N/A" },
          { agent: "verifier", model: "gemini-1.5-flash", tokens_in: 1200, tokens_out: 50, cost_usd: 0.12, latency_ms: 200.0, verdict: "FAIL", issues: ["AGENT_HALLUCINATION"] }
        ]
      },
      {
        id: "REC-004",
        state: "draft",
        amount: 75000.0,
        reason_codes: [],
        lineage: { owner: "Diana", deadline: "2026-10-01", source_format: "json", source_hash: "11223344" },
        agent_trace: [
          { agent: "worker", model: "gemini-1.5-flash", tokens_in: 100, tokens_out: 30, cost_usd: 0.01, latency_ms: 100.0, verdict: "N/A" }
        ]
      }
    ];

    mockRecords.forEach(r => this.records.set(r.id, r));
    this.stats.total_processed = mockRecords.length;
    this.stats.total_cost = 0.438;
    this.stats.avg_cost = 0.438 / 4;
    this.stats.p95_latency = 780.0;
    
    this.isInitialized = true;
  }
}

// Singleton pattern for API routes
export const state = new MockState();
state.initialize();
