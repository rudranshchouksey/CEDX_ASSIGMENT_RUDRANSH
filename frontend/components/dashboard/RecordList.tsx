import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { Record } from '@/types/audit';
import { motion, AnimatePresence } from 'framer-motion';

interface RecordListProps {
  records: Partial<Record>[];
  filter: 'all' | 'in_review' | 'exception';
  setFilter: (f: 'all' | 'in_review' | 'exception') => void;
  exceptionFilter: 'all' | 'agent' | 'data';
  setExceptionFilter: (f: 'all' | 'agent' | 'data') => void;
  selectedRecordId: string | null;
  setSelectedRecordId: (id: string) => void;
}

export function RecordList({ records, filter, setFilter, exceptionFilter, setExceptionFilter, selectedRecordId, setSelectedRecordId }: RecordListProps) {
  const filteredRecords = records.filter(r => {
    if (filter === 'in_review') return r.state === 'in_review';
    if (filter === 'exception') {
      if (!r.reason_codes || r.reason_codes.length === 0) return false;
      if (exceptionFilter === 'agent') return r.reason_codes.some(rc => rc.includes('AGENT'));
      if (exceptionFilter === 'data') return r.reason_codes.some(rc => !rc.includes('AGENT'));
      return true;
    }
    return true;
  });

  return (
    <section className="lg:col-span-4 flex flex-col h-full bg-white border border-zinc-200/60 shadow-sm overflow-hidden rounded-lg">
      <div className="p-4 border-b border-zinc-200/60 flex justify-between items-center bg-[#fafafa]">
        <h2 className="text-sm font-medium tracking-tight text-zinc-900">Ingestion Feed</h2>
        <Badge variant="draft" className="font-mono text-[10px]">{filteredRecords.length} records</Badge>
      </div>
      
      <div className="px-4 py-3 bg-white border-b border-zinc-200/60 flex flex-col gap-3">
         <div className="flex gap-2 p-1 bg-zinc-50 rounded-md border border-zinc-100">
            {['all', 'in_review', 'exception'].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f as any)} 
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all duration-200 ease-in-out ${filter === f ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-900 border border-transparent'}`}>
                  {f === 'in_review' ? 'In Review' : f === 'exception' ? 'Exceptions' : 'All'}
              </button>
            ))}
         </div>
         <AnimatePresence>
           {filter === 'exception' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex gap-4 pt-1 overflow-hidden"
              >
                <button onClick={() => setExceptionFilter('all')} className={`text-[10px] font-mono tracking-normal uppercase transition-all duration-150 ease-in-out ${exceptionFilter === 'all' ? 'text-zinc-900 font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}>All Anomalies</button>
                <button onClick={() => setExceptionFilter('data')} className={`text-[10px] font-mono tracking-normal uppercase transition-all duration-150 ease-in-out ${exceptionFilter === 'data' ? 'text-zinc-900 font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}>Data Heuristics</button>
                <button onClick={() => setExceptionFilter('agent')} className={`text-[10px] font-mono tracking-normal uppercase transition-all duration-150 ease-in-out ${exceptionFilter === 'agent' ? 'text-zinc-900 font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}>Agent Overrules</button>
              </motion.div>
           )}
         </AnimatePresence>
      </div>

      <div className="overflow-y-auto flex-grow bg-white">
        {filteredRecords.length === 0 && <div className="text-center py-12 text-[11px] font-mono text-zinc-400">No records found.</div>}
        <div className="flex flex-col relative">
          {filteredRecords.map(r => {
            const isSelected = r.id === selectedRecordId;
            const hasException = r.reason_codes && r.reason_codes.length > 0;
            return (
              <motion.div 
                layoutId={`record-${r.id}`}
                key={r.id} 
                onClick={() => setSelectedRecordId(r.id!)} 
                className={`relative px-4 py-3.5 cursor-pointer transition-colors duration-150 ease-in-out border-b border-zinc-100 last:border-b-0 ${isSelected ? 'bg-zinc-50' : 'hover:bg-zinc-50/50 bg-white'} flex flex-col gap-2.5 group`}
              >
                {isSelected && (
                  <motion.div layoutId="active-indicator" className="absolute left-0 top-0 bottom-0 w-[3px] bg-zinc-900" />
                )}
                <div className="flex justify-between items-center pl-[2px]">
                  <span className="text-xs font-mono text-zinc-900 tracking-normal font-medium">{r.id}</span>
                  <span className="text-[11px] font-mono text-zinc-500 tracking-normal bg-zinc-50 px-1.5 py-0.5 rounded">${r.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pl-[2px]">
                  <Badge variant={r.state as any}>{r.state}</Badge>
                  {hasException && (
                    <div className="text-[10px] font-medium px-1.5 py-0.5 rounded text-rose-700 bg-rose-50/50 border border-rose-200/40 truncate max-w-[140px]" title={r.reason_codes![0]}>
                      {r.reason_codes![0].split(':')[0]}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
