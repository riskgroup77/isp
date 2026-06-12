import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    message: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const showConfirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const closeConfirm = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  const toastClass = (type: ToastType) => {
    if (type === 'success') return 'ios-toast ios-toast-success';
    if (type === 'error') return 'ios-toast ios-toast-error';
    return 'ios-toast ios-toast-info';
  };

  const iconClass = (type: ToastType) => {
    if (type === 'success') return 'text-emerald-600';
    if (type === 'error') return 'text-red-500';
    return 'text-[var(--ios-text-secondary)]';
  };

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      <div className="fixed top-4 right-4 z-[10001] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 text-sm ${toastClass(toast.type)}`}
          >
            {toast.type === 'success' && (
              <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${iconClass(toast.type)}`} />
            )}
            {toast.type === 'error' && (
              <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${iconClass(toast.type)}`} />
            )}
            {toast.type === 'info' && (
              <Info className={`w-4 h-4 shrink-0 mt-0.5 ${iconClass(toast.type)}`} />
            )}
            <p className="flex-1 leading-relaxed">{toast.message}</p>
            <button
              type="button"
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="text-current opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[10002] ios-overlay flex items-center justify-center p-4">
          <div className="ios-card ios-modal max-w-md w-full p-6 space-y-4 animate-fadeIn">
            <p className="text-sm text-slate-600 leading-relaxed">{confirmState.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="ios-btn ios-btn-frost ios-btn-sm"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className="ios-btn ios-btn-danger ios-btn-sm"
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
