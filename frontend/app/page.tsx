'use client';

import React, { useState, useEffect } from 'react';
import type { Record, SystemStats } from '@/types/audit';
import { Header } from '@/components/dashboard/Header';
import { RecordList } from '@/components/dashboard/RecordList';
import { RecordDetail } from '@/components/dashboard/RecordDetail';
import { AmendmentModal } from '@/components/dashboard/AmendmentModal';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStats & { case_id?: string; role?: string; threshold?: number } | null>(null);
  const [records, setRecords] = useState<Partial<Record>[]>([]);
  const [filter, setFilter] = useState<'all' | 'in_review' | 'exception'>('all');
  const [exceptionFilter, setExceptionFilter] = useState<'all' | 'agent' | 'data'>('all');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<Record | null>(null);
  const [operatorRole, setOperatorRole] = useState('intern');
  const [toasts, setToasts] = useState<{ id: number, type: 'error' | 'success' | 'slate', title: string, message: string }[]>([]);
  const [replayLlm, setReplayLlm] = useState(false);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '');

  // Fetch Core Telemetry
  const fetchData = async () => {
    if (!API_BASE) {
      setStatus({
        case_id: 'MOCK-VERCEL-DEPLOY',
        role: 'finance_controller',
        threshold: 10000,
        avg_cost: 0.0042,
        p95_latency: 120.5,
        total_processed: 0,
        total_cost: 0,
        replay_llm: false
      });
      setRecords([]);
      return;
    }
    try {
      const statusRes = await fetch(`${API_BASE}/api/status`);
      if (statusRes.ok) setStatus(await statusRes.json());
      const recordsRes = await fetch(`${API_BASE}/api/records`);
      if (recordsRes.ok) setRecords(await recordsRes.json());
    } catch (err) {
      addToast('error', 'Network Error', 'Failed to fetch telemetry data.');
    }
  };

  useEffect(() => {
    fetchData();
    const int = setInterval(fetchData, 5000);
    return () => clearInterval(int);
  }, []);

  // Fetch Detail Payload
  useEffect(() => {
    if (!selectedRecordId) {
      setSelectedRecordDetail(null);
      return;
    }
    const fetchDetail = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/records/${selectedRecordId}`);
        if (res.ok) setSelectedRecordDetail(await res.json());
      } catch (err) {
        addToast('error', 'Fetch Error', 'Failed to load record details.');
      }
    };
    fetchDetail();
  }, [selectedRecordId]);

  const addToast = (type: 'error' | 'success' | 'slate', title: string, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const dispatchAction = async (actionStr: string) => {
    if (!selectedRecordId) return addToast('slate', 'Action Blocked', 'Select a record first.');
    
    // Client Side Amendment Interceptor
    if (actionStr === 'approve' && selectedRecordDetail && status?.threshold) {
      if (selectedRecordDetail.amount >= status.threshold && operatorRole !== status.role) {
        setShowAmendmentModal(true);
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: selectedRecordId, actor_role: operatorRole, action: actionStr })
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Action Applied', `Moved ${selectedRecordId} to ${data.record.state}`);
        await fetchData();
        const dRes = await fetch(`${API_BASE}/api/records/${selectedRecordId}`);
        if (dRes.ok) setSelectedRecordDetail(await dRes.json());
      } else {
        addToast(res.status === 403 ? 'error' : 'slate', res.status === 403 ? '403 Forbidden (Amendment Gate)' : 'Validation Error', data.detail || 'Request rejected.');
      }
    } catch (err) {
      addToast('error', 'Network Error', 'Failed to dispatch action.');
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-screen overflow-hidden">
      <div className="px-6 py-6 lg:px-8">
        <Header status={status} replayLlm={replayLlm} setReplayLlm={setReplayLlm} />
      </div>
      
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 px-6 lg:px-8 pb-6 min-h-0">
        <RecordList 
          records={records}
          filter={filter}
          setFilter={setFilter}
          exceptionFilter={exceptionFilter}
          setExceptionFilter={setExceptionFilter}
          selectedRecordId={selectedRecordId}
          setSelectedRecordId={setSelectedRecordId}
        />
        <RecordDetail 
          record={selectedRecordDetail}
          operatorRole={operatorRole}
          setOperatorRole={setOperatorRole}
          dispatchAction={dispatchAction}
        />
      </main>

      <AmendmentModal 
        show={showAmendmentModal} 
        onClose={() => setShowAmendmentModal(false)} 
        status={status} 
      />

      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              className={`bg-white border p-4 rounded-xl shadow-lg flex gap-3 max-w-[320px] pointer-events-auto ${t.type === 'error' ? 'border-rose-200/50 shadow-rose-900/5' : (t.type === 'slate' ? 'border-zinc-200/50 shadow-zinc-900/5' : 'border-emerald-200/50 shadow-emerald-900/5')}`}
            >
              <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${t.type === 'error' ? 'bg-rose-50 text-rose-500' : (t.type === 'slate' ? 'bg-zinc-100 text-zinc-500' : 'bg-emerald-50 text-emerald-500')}`}>
                {t.type === 'error' ? <AlertCircle className="w-3.5 h-3.5" /> : (t.type === 'slate' ? <Info className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />)}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold tracking-tight text-zinc-900">{t.title}</h4>
                <p className="text-[11px] font-mono tracking-normal text-zinc-500 mt-1 leading-relaxed">{t.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
