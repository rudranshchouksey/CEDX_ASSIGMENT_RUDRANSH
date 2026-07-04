import React from 'react';
import { TelemetryBar } from './TelemetryBar';
import { SystemStats } from '@/types/audit';
import { Hexagon } from 'lucide-react';

interface HeaderProps {
  status: (SystemStats & { case_id?: string; role?: string; threshold?: number }) | null;
  replayLlm: boolean;
  setReplayLlm: (v: boolean) => void;
}

export function Header({ status, replayLlm, setReplayLlm }: HeaderProps) {
  return (
    <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 pb-6 border-b border-zinc-200/60">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
          <Hexagon className="w-5 h-5 text-zinc-700 fill-zinc-100" />
          CEDX Operator Workspace
        </h1>
        <div className="flex items-center gap-3 mt-1.5 text-[11px]">
          <span className="text-zinc-400 font-mono tracking-normal uppercase">CASE_ID</span>
          <span className="font-mono text-zinc-700 tracking-normal bg-zinc-100/80 px-1.5 py-0.5 rounded border border-zinc-200/50">{status?.case_id || '...'}</span>
        </div>
      </div>

      <div className="mt-4 lg:mt-0 w-full lg:w-auto">
        <TelemetryBar status={status} replayLlm={replayLlm} setReplayLlm={setReplayLlm} />
      </div>
    </header>
  );
}
