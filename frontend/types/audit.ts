export type AgentRoster = 
  | 'orchestrator'
  | 'worker'
  | 'verifier';

export type ReviewState = 
  | 'draft'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'delivered';

export enum ReasonCode {
  AGENT_HALLUCINATION = 'AGENT_HALLUCINATION',
  INJECTION_BLOCKED = 'INJECTION_BLOCKED',
  FORMAT_ERROR = 'FORMAT_ERROR',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
}

export interface AgentTraceSpan {
  agent: AgentRoster;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  verdict: 'PASS' | 'FAIL' | 'N/A';
  issues?: string[];
}

export interface RecordLineage {
  owner: string;
  deadline: string;
  source_format: string;
  source_hash: string;
}

export interface Record {
  id: string;
  state: ReviewState;
  amount: number;
  reason_codes: string[];
  lineage: RecordLineage;
  agent_trace: AgentTraceSpan[];
}

export interface ApprovalTrail {
  actor_role: string;
  signature: string;
  timestamp: string;
}

export interface EventLog {
  timestamp: string;
  event: string;
  details: string;
}

export interface SystemStats {
  total_processed: number;
  total_cost: number;
  avg_cost: number;
  p95_latency: number;
  replay_llm: boolean;
}
