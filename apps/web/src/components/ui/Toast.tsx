import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastSeverity = 'error' | 'success' | 'warning' | 'info';

interface ToastItem {
  id:        string;
  message:   string;
  severity:  ToastSeverity;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, severity?: ToastSeverity, duration?: number) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Single Toast Card ────────────────────────────────────────────────────────

const SEVERITY_ICONS: Record<ToastSeverity, string> = {
  error:   'error',
  success: 'check_circle',
  warning: 'warning',
  info:    'info',
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, item.duration ?? 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [item.duration, onDismiss]);

  return (
    <div className={`toast toast--${item.severity}`} role="alert" aria-live="assertive">
      <span className="material-symbols-outlined toast-icon">
        {SEVERITY_ICONS[item.severity]}
      </span>
      <p className="toast-message">{item.message}</p>
      <button type="button" className="toast-close" onClick={onDismiss} aria-label="Dismiss notification">
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, severity: ToastSeverity = 'info', duration = 4000) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev.slice(-4), { id, message, severity, duration }]);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" aria-label="Notifications">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
