import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { FiCheckCircle, FiInfo, FiX, FiXCircle } from 'react-icons/fi';

const ToastContext = createContext(null);

const icons = {
  success: FiCheckCircle,
  error: FiXCircle,
  info: FiInfo,
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    if (!message) return;

    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => removeToast(id), 3000);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-20 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6">
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || FiInfo;
          return (
            <div className="glass flex items-start gap-3 rounded-2xl p-4 text-sm text-slate-100" key={toast.id}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${toast.type === 'error' ? 'bg-rose-400 text-white' : toast.type === 'success' ? 'bg-emerald-300 text-slate-950' : 'bg-cyan-300 text-slate-950'}`}>
                <Icon />
              </span>
              <p className="min-w-0 flex-1 font-semibold">{toast.message}</p>
              <button className="text-slate-400 transition hover:text-white" onClick={() => removeToast(toast.id)} title="Fermer">
                <FiX />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
