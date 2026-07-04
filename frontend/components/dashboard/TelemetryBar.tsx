import React from 'react';
import { Activity, ShieldAlert, FileText, CheckCircle, Clock } from 'lucide-react';
import { SystemStats } from '@/types/audit';
import { cn } from '@/lib/utils';

interface TelemetryBarProps {
  status: (SystemStats & { case_id?: string; role?: string; threshold?: number }) | null;
  replayLlm: boolean;
  setReplayLlm: (v: boolean) => void;
}

export function TelemetryBar({ status, replayLlm, setReplayLlm }: TelemetryBarProps) {
  return (
    <div className="flex flex-wrap items-stretch border border-zinc-200/60 rounded-md bg-white shadow-sm overflow-hidden">
      {/* REPLAY_LLM Toggle */}
      <div className="flex items-center p-1.5 border-r border-zinc-200/60 bg-[#fafafa]">
        <button 
          onClick={() => setReplayLlm(false)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-sm transition-all duration-150 ease-in-out",
            !replayLlm ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700 border border-transparent'
          )}>
          Live
        </button>
        <button 
          onClick={() => setReplayLlm(true)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-sm transition-all duration-150 ease-in-out",
            replayLlm ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700 border border-transparent'
          )}>
          Offline
        </button>
      </div>

      <div className="flex items-center h-full divide-x divide-zinc-200/60">
        <div className="px-5 py-2.5 flex flex-col justify-center min-w-[120px]">
          <span className="text-[10px] text-zinc-400 font-mono tracking-normal uppercase mb-0.5 flex items-center gap-1.5"><ShieldAlert className="w-3 h-3"/> Role R</span>
          <span className="font-medium text-zinc-700 text-xs tracking-tight">
            {status?.role || '...'}
          </span>
        </div>
        <div className="px-5 py-2.5 flex flex-col justify-center min-w-[120px]">
          <span className="text-[10px] text-zinc-400 font-mono tracking-normal uppercase mb-0.5 flex items-center gap-1.5"><FileText className="w-3 h-3"/> Threshold T</span>
          <span className="font-mono text-zinc-700 text-xs tracking-normal">
            ${status?.threshold?.toLocaleString() || '...'}
          </span>
        </div>
        <div className="px-5 py-2.5 flex flex-col justify-center min-w-[120px]">
          <span className="text-[10px] text-zinc-400 font-mono tracking-normal uppercase mb-0.5 flex items-center gap-1.5"><Activity className="w-3 h-3"/> Avg Cost</span>
          <span className="font-mono text-zinc-700 text-xs tracking-normal">
            ${status?.avg_cost?.toFixed(4) || '0.0000'}
          </span>
        </div>
        <div className="px-5 py-2.5 flex flex-col justify-center min-w-[120px]">
          <span className="text-[10px] text-zinc-400 font-mono tracking-normal uppercase mb-0.5 flex items-center gap-1.5"><Clock className="w-3 h-3"/> p95 Latency</span>
          <span className="font-mono text-zinc-700 text-xs tracking-normal">
            {status?.p95_latency?.toFixed(1) || '0.0'}ms
          </span>
        </div>
      </div>
    </div>
  );
}
