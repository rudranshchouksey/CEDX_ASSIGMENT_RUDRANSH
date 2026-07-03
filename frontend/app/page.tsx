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
  const [replayLlm, setReplayLlm] = useState(false);

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
      'draft': 'bg-slate-100 text-slate-500 border border-slate-200/60',
      'in_review': 'bg-blue-50 text-blue-600 border border-blue-200/60',
      'changes_requested': 'bg-yellow-50 text-yellow-600 border border-yellow-200/60',
      'approved': 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
      'delivered': 'bg-emerald-100 text-emerald-700 border border-emerald-300/60',
      'exception': 'bg-red-50 text-red-600 border border-red-200/60'
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
      {/* Top Navigation & Live Telemetry Bar */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 pb-6 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl md:text-2xl font-semibold tracking-tight text-slate-900">
            CEDX Operator
          </h1>
          <div className="flex items-center gap-3 text-sm mt-1">
            <span className="text-slate-500">CASE_ID:</span>
            <span className="font-mono text-accent font-medium bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{status?.case_id || '...'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
          {/* Segmented Toggle for REPLAY_LLM */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80 shadow-inner mr-4">
            <button 
              onClick={() => setReplayLlm(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${!replayLlm ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-700'}`}>
              Live
            </button>
            <button 
              onClick={() => setReplayLlm(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${replayLlm ? 'bg-white text-accent shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-700'}`}>
              Offline
            </button>
          </div>

          <div className="glass-panel px-4 py-2 flex flex-col justify-center min-w-[120px]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Role R</span>
            <span className="font-medium text-slate-900 text-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
              {status?.role || '...'}
            </span>
          </div>
          <div className="glass-panel px-4 py-2 flex flex-col justify-center min-w-[120px]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Threshold T</span>
            <span className="font-medium text-slate-900 text-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              ${status?.threshold?.toLocaleString() || '...'}
            </span>
          </div>
          <div className="glass-panel px-4 py-2 flex flex-col justify-center min-w-[120px]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Avg Cost / Rec</span>
            <span className="font-medium text-slate-900 text-sm font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              ${status?.avg_cost?.toFixed(4) || '0.0000'}
            </span>
          </div>
          <div className="glass-panel px-4 py-2 flex flex-col justify-center min-w-[120px]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">p95 Latency</span>
            <span className="font-medium text-slate-900 text-sm font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              {status?.p95_latency?.toFixed(1) || '0.0'}ms
            </span>
          </div>
          <div className="glass-panel px-4 py-2 flex flex-col justify-center min-w-[120px]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Total Run Cost</span>
            <span className="font-medium text-slate-900 text-sm font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              ${((status?.avg_cost || 0) * records.length).toFixed(4)}
            </span>
          </div>
        </div>
      </header>

      {/* Dual Pane Layout */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-160px)]">
        
        {/* Left Pane (Master) */}
        <section className="lg:col-span-4 flex flex-col overflow-hidden h-full">
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              Pipeline Stream
            </h2>
            <span className="text-[10px] text-slate-500 font-medium bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">{filteredRecords.length} records</span>
          </div>
          
          <div className="flex gap-2 mb-3 px-1">
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'}`}>All</button>
            <button onClick={() => setFilter('in_review')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === 'in_review' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'}`}>In Review</button>
            <button onClick={() => setFilter('exception')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === 'exception' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'}`}>Exceptions</button>
          </div>

          <div className="overflow-y-auto flex-grow space-y-1.5 pr-2">
            {filteredRecords.length === 0 && <div className="text-center py-10 text-slate-500 text-sm">No records found.</div>}
            {filteredRecords.map(r => {
              const isSelected = r.id === selectedRecordId;
              const hasException = r.reason_codes && r.reason_codes.length > 0;
              return (
                <div 
                  key={r.id} 
                  onClick={() => setSelectedRecordId(r.id!)} 
                  className={`p-3.5 rounded-lg cursor-pointer transition-colors border bg-white ${isSelected ? 'border-l-2 border-l-accent border-y-slate-200/80 border-r-slate-200/80 shadow-sm bg-slate-50/50' : 'border-slate-200/50 border-l-2 border-l-transparent hover:bg-slate-100/70 hover:border-slate-200'} flex flex-col gap-2`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-semibold text-slate-900">{r.id}</span>
                    <span className="text-xs font-semibold text-slate-700">${r.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${getBadgeStyle(r.state)} uppercase font-bold tracking-wider`}>{r.state}</span>
                  </div>
                  {hasException && (
                    <div className={`mt-1 text-[9px] uppercase font-bold px-2 py-1 rounded-md ${r.reason_codes![0].includes("AGENT") ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'} inline-flex items-center gap-1.5 w-max`} title={r.reason_codes![0]}>
                      <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                      {r.reason_codes![0].split(':')[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Pane (Detail) */}
        <section className="lg:col-span-8 glass-panel flex flex-col overflow-hidden h-full relative">
          {!selectedRecordId && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 backdrop-blur-sm rounded-lg">
              <div className="text-center text-slate-400 text-sm">
                <p>Select a record to inspect observability traces.</p>
              </div>
            </div>
          )}

          {selectedRecordDetail && (
            <>
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
                <div>
                  <h2 className="text-lg font-bold font-mono text-slate-900">{selectedRecordDetail.id}</h2>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-1 rounded-md ${getBadgeStyle(selectedRecordDetail.state)} uppercase tracking-wider font-bold`}>{selectedRecordDetail.state}</span>
                    {selectedRecordDetail.reason_codes?.map(rc => (
                      <span key={rc} className="text-[10px] px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 uppercase font-bold truncate max-w-[200px]" title={rc}>{rc.split(':')[0]}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-slate-900">${selectedRecordDetail.amount.toLocaleString()}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mt-1">Total Value</div>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-8 bg-slate-50/30">
                {/* Lineage Summary Grid */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Ingestion Summary
                  </h3>
                  <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                      <div className="p-4 flex-1">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Owner</div>
                        <div className="text-sm font-medium text-slate-900">{selectedRecordDetail.lineage?.owner || 'N/A'}</div>
                      </div>
                      <div className="p-4 flex-1">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Format</div>
                        <div className="text-sm font-medium text-slate-900 font-mono">{selectedRecordDetail.lineage?.source_format || 'N/A'}</div>
                      </div>
                      <div className="p-4 flex-1">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Deadline</div>
                        <div className="text-sm font-medium text-slate-900">{selectedRecordDetail.lineage?.deadline || 'N/A'}</div>
                      </div>
                      <div className="p-4 flex-1">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Signature Hash</div>
                        <div className="text-xs font-medium font-mono text-slate-500 truncate max-w-[120px]" title={selectedRecordDetail.lineage?.source_hash}>{selectedRecordDetail.lineage?.source_hash || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Component */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-6">
                    Agent Decision Trace
                  </h3>
                  <div className="pl-3 space-y-6">
                    {(!selectedRecordDetail.agent_trace || selectedRecordDetail.agent_trace.length === 0) && (
                      <div className="text-slate-400 text-sm">No agent traces logged.</div>
                    )}
                    {selectedRecordDetail.agent_trace?.map((span, i) => {
                      const isFail = span.verdict === 'FAIL';
                      const isVerifier = span.agent.toLowerCase().includes('verifier');
                      return (
                        <div key={i} className="relative pl-8 timeline-item timeline-connector">
                          {/* Distinct Icon Node */}
                          <div className={`absolute left-0 top-1.5 -ml-[5px] w-[11px] h-[11px] rounded-full ring-4 ring-slate-50 ${isFail ? 'bg-red-500' : (isVerifier ? 'bg-emerald-500' : 'bg-slate-300')} z-10`}></div>
                          
                          <div className={`bg-white rounded-xl p-4 border shadow-sm transition-shadow hover:shadow-md ${isFail ? 'border-red-200' : 'border-slate-200/80'}`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">{span.agent}</span>
                                {isVerifier && !isFail && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 uppercase font-bold tracking-wider">Pass</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className="font-mono bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded text-slate-600 font-medium">{span.model}</span>
                                <span className="text-slate-400">{span.latency_ms}ms</span>
                                <span className="text-slate-400">${span.cost_usd.toFixed(5)}</span>
                              </div>
                            </div>
                            
                            {/* Fail State: High visibility */}
                            {isFail && span.issues && (
                              <div className="mt-3 p-3 bg-red-50 border-l-2 border-l-red-500 rounded-r-lg text-xs text-red-700 font-medium flex flex-col gap-1">
                                {span.issues.map((iss, idx) => (
                                  <span key={idx} className="flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-red-500 shrink-0"></span>
                                    {iss}
                                  </span>
                                ))}
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
              <div className="p-5 bg-white border-t border-slate-200/80 rounded-b-8px">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="w-full md:w-1/3">
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Simulated Operator Role</label>
                    <select value={operatorRole} onChange={(e) => setOperatorRole(e.target.value)} className="w-full bg-white border border-slate-200/80 shadow-sm rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all">
                      <option value="intern">Intern (Unauthorized)</option>
                      <option value="risk_officer">Risk Officer</option>
                      <option value="legal_counsel">Legal Counsel</option>
                      <option value="compliance">Compliance</option>
                      <option value="finance_controller">Finance Controller</option>
                    </select>
                  </div>
                  <div className="flex-grow flex gap-3 w-full md:w-auto pt-[22px]">
                    <button 
                      onClick={() => dispatchAction('request_changes')} 
                      disabled={selectedRecordDetail.state !== 'in_review'}
                      className={`flex-1 text-sm font-semibold py-2 px-4 rounded-lg transition-all border shadow-sm ${selectedRecordDetail.state !== 'in_review' ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}>
                      Request Changes
                    </button>
                    <button 
                      onClick={() => dispatchAction('approve')} 
                      disabled={selectedRecordDetail.state !== 'in_review'}
                      className={`flex-1 text-sm font-semibold py-2 px-4 rounded-lg transition-all shadow-sm ${selectedRecordDetail.state !== 'in_review' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-accent text-white hover:bg-indigo-700'}`}>
                      Approve Override
                    </button>
                    <button 
                      onClick={() => dispatchAction('deliver')} 
                      disabled={selectedRecordDetail.state !== 'approved'}
                      className={`flex-1 text-sm font-semibold py-2 px-4 rounded-lg transition-all shadow-sm ${selectedRecordDetail.state !== 'approved' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_1px_2px_rgba(16,185,129,0.2)]'}`}>
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
          <div key={t.id} className={`bg-white border p-4 rounded-xl shadow-premium flex gap-3 max-w-sm toast-enter pointer-events-auto ${t.type === 'error' ? 'border-red-200' : 'border-emerald-200'}`}>
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${t.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {t.type === 'error' ? '!' : '✓'}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{t.message}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
