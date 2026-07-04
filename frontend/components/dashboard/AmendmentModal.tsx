import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, X } from 'lucide-react';
import { SystemStats } from '@/types/audit';

interface AmendmentModalProps {
  show: boolean;
  onClose: () => void;
  status: (SystemStats & { case_id?: string; role?: string; threshold?: number }) | null;
}

export function AmendmentModal({ show, onClose, status }: AmendmentModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white border border-zinc-200 rounded-xl shadow-2xl max-w-md w-full p-6 relative z-10 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-rose-600" />
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 shadow-sm">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-zinc-900">Delivery Intercepted</h3>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 rounded-md hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[13px] tracking-normal text-zinc-600 mb-6 leading-relaxed">
              Action blocked. An authorized cryptographically computed signature from <span className="font-semibold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/50 shadow-sm">Role {status?.role}</span> is explicitly mandatory to authorize delivery for transactions evaluated at or above <span className="font-semibold text-zinc-900 font-mono bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/50 shadow-sm">${status?.threshold?.toLocaleString()}</span>.
            </p>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-zinc-900 text-white rounded-md text-xs font-medium tracking-tight hover:bg-zinc-800 transition-all duration-150 ease-in-out shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2">
                Acknowledge & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
