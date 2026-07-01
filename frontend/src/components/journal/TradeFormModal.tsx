'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { TradeForm } from './TradeForm';
import type { TradeFormData } from '@/lib/journal';

interface TradeFormModalProps {
  open: boolean;
  form: TradeFormData;
  onChange: (form: TradeFormData) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitting?: boolean;
  editing?: boolean;
}

export function TradeFormModal({
  open,
  form,
  onChange,
  onSubmit,
  onClose,
  submitting,
  editing,
}: TradeFormModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => !submitting && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-form-title"
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/[0.1] bg-[#0a0e14] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#0a0e14]/95 backdrop-blur-md">
          <div>
            <h2 id="trade-form-title" className="text-lg font-semibold tracking-tight">
              {editing ? 'Edit Trade' : 'Register Trade'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Log entry, exit, size, and exchange — PnL is calculated automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <TradeForm
            form={form}
            onChange={onChange}
            onSubmit={onSubmit}
            onCancel={onClose}
            submitting={submitting}
            editing={editing}
            embedded
          />
        </div>
      </div>
    </div>
  );
}
