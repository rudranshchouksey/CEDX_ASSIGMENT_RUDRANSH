import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Record } from '@/types/audit';
import { Bot, User, Clock, Hash, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RecordDetailProps {
  record: Record | null;
  operatorRole: string;
  setOperatorRole: (r: string) => void;
  dispatchAction: (action: string) => void;
}

export function RecordDetail({ record, operatorRole, setOperatorRole, dispatchAction }: RecordDetailProps) {
  if (!record) {
    return (
      <section className="lg:col-span-8 flex flex-col h-full bg-[#fafafa]/50 border border-zinc-200/60 rounded-lg overflow-hidden relative items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <Bot className="w-8 h-8 opacity-20" />
          <p className="text-[11px] font-mono">Select a record to inspect observability traces</p>
        </div>
      </section>
    );
  }

  return (
    <section className="lg:col-span-8 flex flex-col h-full bg-white border border-zinc-200/60 rounded-lg overflow-hidden relative shadow-sm">
      {/* Detail Header */}
      <div className="p-6 border-b border-zinc-200/60 bg-white flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
            {record.id}
          </h2>
          <div className="flex gap-2 mt-3 flex-wrap items-center">
            <Badge variant={record.state as any}>{record.state}</Badge>
            {record.reason_codes?.map(rc => (
              <span key={rc} className="text-[10px] font-medium px-2 py-0.5 rounded-full text-rose-700 bg-rose-50 border border-rose-200/50 truncate max-w-[200px]" title={rc}>
                {rc.split(':')[0]}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tracking-tight text-zinc-900 font-mono">${record.amount?.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mt-1.5">Total Value</div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto bg-[#fafafa]/30 flex flex-col">
        {/* Ingestion Attributes Grid */}
        <div className="px-8 py-6 border-b border-zinc-200/60 bg-white">
          <h3 className="text-xs font-semibold text-zinc-900 tracking-tight mb-5 flex items-center gap-2">
            <Hash className="w-4 h-4 text-zinc-400" /> Ingestion Attributes
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-zinc-400 font-mono tracking-normal uppercase flex items-center gap-1.5"><User className="w-3 h-3"/> Owner</span>
              <span className="text-sm font-medium tracking-tight text-zinc-900">{record.lineage?.owner || 'N/A'}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-zinc-400 font-mono tracking-normal uppercase flex items-center gap-1.5"><FileCode className="w-3 h-3"/> Format</span>
              <span className="text-xs font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md w-fit">{record.lineage?.source_format || 'N/A'}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-zinc-400 font-mono tracking-normal uppercase flex items-center gap-1.5"><Clock className="w-3 h-3"/> Deadline</span>
              <span className="text-sm font-medium tracking-tight text-zinc-900">{record.lineage?.deadline || 'N/A'}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-zinc-400 font-mono tracking-normal uppercase flex items-center gap-1.5"><Hash className="w-3 h-3"/> Source Hash</span>
              <span className="text-[11px] font-mono text-zinc-500 truncate bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-100" title={record.lineage?.source_hash}>{record.lineage?.source_hash || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Timeline Component */}
        <div className="px-8 py-8 flex-grow">
          <h3 className="text-xs font-semibold text-zinc-900 tracking-tight mb-8 flex items-center gap-2">
            <Bot className="w-4 h-4 text-zinc-400" /> Agent Execution Trace
          </h3>
          <div className="relative pl-4 max-w-4xl">
            {/* Continuous vertical axis thread */}
            <div className="absolute left-[3.5px] top-2 bottom-2 w-[2px] bg-zinc-200/80 rounded-full"></div>
            
            {(!record.agent_trace || record.agent_trace.length === 0) && (
              <div className="text-[11px] font-mono text-zinc-400 ml-6 italic">No agent traces logged.</div>
            )}
            
            <div className="flex flex-col gap-8">
              <AnimatePresence>
                {record.agent_trace?.map((span, i) => {
                  const isFail = span.verdict === 'FAIL';
                  const isVerifier = span.agent.toLowerCase().includes('verifier');
                  
                  return (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="relative z-10 flex items-start group"
                    >
                      {/* Node Dot */}
                      <div className={`mt-[9px] -ml-[2px] w-3 h-3 rounded-full ring-4 ring-[#fafafa] z-10 shrink-0 shadow-sm ${isFail ? 'bg-rose-500' : (isVerifier ? 'bg-zinc-800' : 'bg-zinc-400')}`}></div>
                      
                      <div className={`ml-6 flex-grow bg-white p-5 rounded-lg transition-all duration-200 ${isFail ? 'shadow-sm border border-rose-200 bg-rose-50/30' : 'border border-zinc-200/60 shadow-sm hover:shadow-md'}`}>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold tracking-tight text-zinc-900 capitalize">{span.agent}</span>
                            <span className="text-[10px] font-mono tracking-normal text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/50">{span.model}</span>
                            {isVerifier && !isFail && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 tracking-tight ml-1">
                                <CheckCircle2 className="w-3 h-3" /> PASS
                              </span>
                            )}
                            {isFail && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/60 tracking-tight ml-1">
                                <AlertCircle className="w-3 h-3" /> FAIL
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-5 text-[11px] font-mono tracking-normal text-zinc-500">
                            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-zinc-400"/> {span.latency_ms}ms</span>
                            <span className="flex items-center gap-1.5 text-zinc-700 font-medium">${span.cost_usd.toFixed(5)}</span>
                          </div>
                        </div>
                        
                        {isFail && span.issues && (
                          <div className="mt-4 pt-4 border-t border-rose-100 flex flex-col gap-2">
                            {span.issues.map((iss, idx) => (
                              <span key={idx} className="flex items-start gap-2 text-[11px] font-mono tracking-normal text-rose-700 bg-rose-50/50 p-2 rounded border border-rose-100/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                                {iss}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-5 bg-white border-t border-zinc-200/60 flex flex-col sm:flex-row gap-4 sm:items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-20">
        <div className="w-full sm:w-auto flex items-center gap-3">
          <label className="text-[10px] font-mono tracking-normal text-zinc-400 uppercase font-semibold">Simulated Role</label>
          <div className="relative">
            <select 
              value={operatorRole} 
              onChange={(e) => setOperatorRole(e.target.value)} 
              className="appearance-none bg-zinc-50 border border-zinc-200/80 rounded-md pl-3 pr-8 py-1.5 text-xs font-medium tracking-tight text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 transition-all duration-150 ease-in-out cursor-pointer hover:bg-zinc-100">
              <option value="intern">Intern (Unauthorized)</option>
              <option value="risk_officer">Risk Officer</option>
              <option value="legal_counsel">Legal Counsel</option>
              <option value="compliance">Compliance</option>
              <option value="finance_controller">Finance Controller</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <Button 
            variant="outline"
            onClick={() => dispatchAction('exception')} 
            disabled={record.state === 'delivered'}
          >
            Isolate to Exception
          </Button>
          <Button 
            variant="secondary"
            onClick={() => dispatchAction('request_changes')} 
            disabled={record.state !== 'in_review'}
          >
            Request Revision
          </Button>
          <Button 
            variant="default"
            onClick={() => dispatchAction('approve')} 
            disabled={record.state !== 'in_review'}
          >
            Approve System Delivery
          </Button>
        </div>
      </div>
    </section>
  );
}
