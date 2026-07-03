'use client';

import React, { useState, useEffect } from 'react';
import type { Record, SystemStats } from '@/types/audit';

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStats & { case_id?: string; role?: string; threshold?: number } | null>(null);
  const [records, setRecords] = useState<Partial<Record>[]>([]);
  const [filter, setFilter] = useState<'all' | 'in_review' | 'exception'>('all');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<Record | null>(null);
  const [operatorRole, setOperatorRole] = useState('intern');
  const [toasts, setToasts] = useState<{ id: number, type: 'error' | 'success', title: string, message: string }[]>([]);

  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  // Fetch Core Telemetry
  const fetchData = async () => {
    try {
      const statusRes = await fetch(`${API_BASE}/api/status`);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }
      const recordsRes = await fetch(`${API_BASE}/api/records`);
      if (recordsRes.ok) {
        setRecords(await recordsRes.json());
      }
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
        if (res.ok) {
          setSelectedRecordDetail(await res.json());
        }
      } catch (err) {
        addToast('error', 'Fetch Error', 'Failed to load record details.');
      }
    };
    fetchDetail();
  }, [selectedRecordId]);

  // Toaster logic
  const addToast = (type: 'error' | 'success', title: string, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Actions
  const dispatchAction = async (actionStr: string) => {
    if (!selectedRecordId) return addToast('error', 'Action Blocked', 'Select a record first.');
    
    // Client Side Guardrail
    if (actionStr === 'deliver' && selectedRecordDetail && status?.threshold) {
      if (selectedRecordDetail.amount >= status.threshold && operatorRole !== status.role) {
        addToast('error', 'Client Guardrail Warning', `High value payload. Role '${status.role}' required. Dispatching to API...`);
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
        // Force refresh detail
        const dRes = await fetch(`${API_BASE}/api/records/${selectedRecordId}`);
        if (dRes.ok) setSelectedRecordDetail(await dRes.json());
      } else {
        addToast('error', res.status === 403 ? '403 Forbidden (Live Amendment Gate)' : 'Validation Error', data.detail || 'Request rejected.');
      }
    } catch (err) {
      addToast('error', 'Network Error', 'Failed to dispatch action.');
    }
  };

  const getBadgeStyle = (state?: string) => {
    const styles: any = {
      'draft': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
      'in_review': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      'changes_requested': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      'approved': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      'delivered': 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50',
      'exception': 'bg-red-500/20 text-red-400 border border-red-500/30'
    };
    return styles[state || 'draft'] || styles['draft'];
  };

  const filteredRecords = records.filter(r => {
    if (filter === 'in_review') return r.state === 'in_review';
    if (filter === 'exception') return r.reason_codes && r.reason_codes.length > 0;
    return true;
  });

  return (
    <>
      {/* Top Navigation */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            CEDX Operator SPA
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            CASE_ID: <span className="font-mono text-accent">{status?.case_id || '...'}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
          <div className="glass-panel px-4 py-2 rounded-xl flex flex-col items-center">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Role</span>
            <span className="font-bold text-white">{status?.role || '...'}</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-xl flex flex-col items-center">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Threshold</span>
            <span className="font-bold text-white">${status?.threshold?.toLocaleString() || '...'}</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-xl flex flex-col items-center">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Avg Cost</span>
            <span className="font-bold text-white">${status?.avg_cost?.toFixed(4) || '...'}</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-xl flex flex-col items-center">
            <span className="text-xs text-slate-400 uppercase tracking-wider">p95 Latency</span>
            <span className="font-bold text-white">{status?.p95_latency?.toFixed(1) || '...'}ms</span>
          </div>
        </div>
      </header>

      {/* Dual Pane Layout */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-160px)]">
        
        {/* Left Pane (Master) */}
        <section className="lg:col-span-5 glass-panel rounded-2xl flex flex-col overflow-hidden h-full">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              Master Queue
            </h2>
            <span className="text-xs text-slate-400 bg-black/30 px-2 py-1 rounded-full">{filteredRecords.length} items</span>
          </div>
          
          <div className="p-3 bg-black/20 flex gap-2 overflow-x-auto">
            <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition ${filter === 'all' ? 'bg-accent text-white' : 'bg-white/10 text-slate-300'}`}>All</button>
            <button onClick={() => setFilter('in_review')} className={`px-3 py-1 rounded-full text-xs font-medium transition ${filter === 'in_review' ? 'bg-accent text-white' : 'bg-white/10 text-slate-300'}`}>In Review</button>
            <button onClick={() => setFilter('exception')} className={`px-3 py-1 rounded-full text-xs font-medium transition ${filter === 'exception' ? 'bg-accent text-white' : 'bg-white/10 text-slate-300'}`}>Exceptions</button>
          </div>

          <div className="overflow-y-auto flex-grow p-2 space-y-2">
            {filteredRecords.length === 0 && <div className="text-center py-10 text-slate-500 text-sm">No records found.</div>}
            {filteredRecords.map(r => {
              const isSelected = r.id === selectedRecordId;
              const hasException = r.reason_codes && r.reason_codes.length > 0;
              return (
                <div key={r.id} onClick={() => setSelectedRecordId(r.id!)} className={`p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-white/10 border-accent/50' : 'bg-black/20 border-transparent hover:bg-white/5'} flex flex-col gap-2`}>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm font-bold text-white">{r.id}</span>
                    <span className="text-sm font-medium">${r.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeStyle(r.state)} uppercase font-semibold`}>{r.state}</span>
                  </div>
                  {hasException && (
                    <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${r.reason_codes![0].includes("AGENT") ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'} inline-block truncate w-full`} title={r.reason_codes![0]}>
                      ⚠️ {r.reason_codes![0].split(':')[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Pane (Detail) */}
        <section className="lg:col-span-7 glass-panel rounded-2xl flex flex-col overflow-hidden h-full relative">
          {!selectedRecordId && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
              <div className="text-center text-slate-500">
                <p>Select a record to inspect observability traces.</p>
              </div>
            </div>
          )}

          {selectedRecordDetail && (
            <>
              <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold font-mono text-accent">{selectedRecordDetail.id}</h2>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-md ${getBadgeStyle(selectedRecordDetail.state)} uppercase tracking-wider font-semibold`}>{selectedRecordDetail.state}</span>
                    {selectedRecordDetail.reason_codes?.map(rc => (
                      <span key={rc} className="text-xs px-2 py-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 truncate max-w-[200px]" title={rc}>{rc.split(':')[0]}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">${selectedRecordDetail.amount.toLocaleString()}</div>
                  <div className="text-sm text-slate-400">Total Value</div>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-6">
                {/* Lineage Card */}
                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                    Lineage Profile
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><div className="text-[10px] text-slate-500 uppercase">Owner</div><div className="text-sm font-medium">{selectedRecordDetail.lineage?.owner || 'N/A'}</div></div>
                    <div><div className="text-[10px] text-slate-500 uppercase">Format</div><div className="text-sm font-medium font-mono">{selectedRecordDetail.lineage?.source_format || 'N/A'}</div></div>
                    <div><div className="text-[10px] text-slate-500 uppercase">Deadline</div><div className="text-sm font-medium">{selectedRecordDetail.lineage?.deadline || 'N/A'}</div></div>
                    <div><div className="text-[10px] text-slate-500 uppercase">Hash</div><div className="text-sm font-medium font-mono text-accent truncate" title={selectedRecordDetail.lineage?.source_hash}>{selectedRecordDetail.lineage?.source_hash || 'N/A'}</div></div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                    Multi-Agent Trace
                  </h3>
                  <div className="pl-2">
                    {(!selectedRecordDetail.agent_trace || selectedRecordDetail.agent_trace.length === 0) && (
                      <div className="text-slate-500 text-sm">No agent traces logged.</div>
                    )}
                    {selectedRecordDetail.agent_trace?.map((span, i) => {
                      const isFail = span.verdict === 'FAIL';
                      return (
                        <div key={i} className="relative pl-10 pb-6 timeline-item timeline-connector">
                          <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border ${isFail ? 'bg-red-500/20 border-red-500/50' : 'bg-blue-500/20 border-blue-500/50'} flex items-center justify-center z-10 bg-[#0b0f19]`}>
                            <span className={isFail ? 'text-red-400 text-xs' : 'text-blue-400 text-xs'}>★</span>
                          </div>
                          <div className={`bg-black/30 rounded-xl p-4 border ${isFail ? 'border-red-500/30' : 'border-white/5'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-bold text-white uppercase tracking-wider">{span.agent}</span>
                              <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded text-slate-300">{span.model}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-slate-400">
                              <div><span className="block uppercase text-[9px] text-slate-500">Tokens</span><span className="font-mono text-white">{span.tokens_in} IN / {span.tokens_out} OUT</span></div>
                              <div><span className="block uppercase text-[9px] text-slate-500">Latency</span><span className="font-mono text-white">{span.latency_ms}ms</span></div>
                              <div><span className="block uppercase text-[9px] text-slate-500">Cost</span><span className="font-mono text-white">${span.cost_usd.toFixed(5)}</span></div>
                            </div>
                            {isFail && span.issues && (
                              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300">
                                {span.issues.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-4 bg-black/40 border-t border-white/10 backdrop-blur-md">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="w-full md:w-1/3">
                    <label className="block text-xs text-slate-400 mb-1">Simulated Operator Role</label>
                    <select value={operatorRole} onChange={(e) => setOperatorRole(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent">
                      <option value="intern">Intern (Unauthorized)</option>
                      <option value="risk_officer">Risk Officer</option>
                      <option value="legal_counsel">Legal Counsel</option>
                      <option value="compliance">Compliance</option>
                      <option value="finance_controller">Finance Controller</option>
                    </select>
                  </div>
                  <div className="flex-grow flex gap-2 w-full md:w-auto pt-5">
                    <button 
                      onClick={() => dispatchAction('request_changes')} 
                      disabled={selectedRecordDetail.state !== 'in_review'}
                      className={`flex-1 text-white text-sm font-medium py-2 px-4 rounded-lg transition ${selectedRecordDetail.state !== 'in_review' ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600'}`}>
                      Request Changes
                    </button>
                    <button 
                      onClick={() => dispatchAction('approve')} 
                      disabled={selectedRecordDetail.state !== 'in_review'}
                      className={`flex-1 text-white text-sm font-medium py-2 px-4 rounded-lg transition ${selectedRecordDetail.state !== 'in_review' ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-accent hover:bg-blue-600'}`}>
                      Approve Override
                    </button>
                    <button 
                      onClick={() => dispatchAction('deliver')} 
                      disabled={selectedRecordDetail.state !== 'approved'}
                      className={`flex-1 text-white text-sm font-medium py-2 px-4 rounded-lg transition ${selectedRecordDetail.state !== 'approved' ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-success hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}>
                      Deliver
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Toaster Container */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`glass-panel border p-4 rounded-xl shadow-2xl flex gap-3 max-w-sm toast-enter pointer-events-auto ${t.type === 'error' ? 'border-red-500/50' : 'border-emerald-500/50'}`}>
            <div className="mt-0.5">
              {t.type === 'error' ? '🚫' : '✅'}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{t.title}</h4>
              <p className="text-xs text-slate-300 mt-1">{t.message}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
