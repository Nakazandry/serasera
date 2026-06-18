import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { FiAlertTriangle, FiCheck, FiX } from 'react-icons/fi';

const DialogContext = createContext(null);

export const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);

  const closeDialog = useCallback((value) => {
    setDialog((current) => {
      if (current?.resolve) current.resolve(value);
      return null;
    });
  }, []);

  const openDialog = useCallback((options) => new Promise((resolve) => {
    setDialog({ ...options, resolve, value: options.defaultValue || '' });
  }), []);

  const confirmDialog = useCallback((options) => openDialog({ type: 'confirm', ...options }), [openDialog]);
  const inputDialog = useCallback((options) => openDialog({ type: 'input', ...options }), [openDialog]);
  const selectDialog = useCallback((options) => openDialog({ type: 'select', ...options }), [openDialog]);

  const value = useMemo(() => ({ confirmDialog, inputDialog, selectDialog }), [confirmDialog, inputDialog, selectDialog]);
  const isInput = dialog?.type === 'input';
  const isSelect = dialog?.type === 'select';

  const submitDialog = (event) => {
    event.preventDefault();
    if (dialog?.type === 'confirm') {
      closeDialog(true);
      return;
    }
    closeDialog(dialog?.value || '');
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm">
          <form className="glass w-full max-w-md rounded-2xl p-5 shadow-2xl" onSubmit={submitDialog}>
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cyan-300 text-slate-950">
                <FiAlertTriangle />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black">{dialog.title || 'Confirmation'}</h2>
                {dialog.message && <p className="mt-2 text-sm text-slate-300">{dialog.message}</p>}
              </div>
              <button className="rounded-full border border-line p-2 text-slate-300 transition hover:bg-white/10 hover:text-white" type="button" onClick={() => closeDialog(null)} title="Fermer">
                <FiX />
              </button>
            </div>

            {isInput && (
              <textarea
                className="input mt-5 min-h-28"
                autoFocus
                placeholder={dialog.placeholder || 'Écrire ici...'}
                value={dialog.value}
                onChange={(event) => setDialog((current) => ({ ...current, value: event.target.value }))}
              />
            )}

            {isSelect && (
              <div className="mt-5 space-y-2">
                {(dialog.options || []).map((option) => (
                  <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm font-semibold transition ${dialog.value === option ? 'border-cyan-300 bg-cyan-300/15 text-cyan-100' : 'border-line bg-white/5 text-slate-200 hover:bg-white/10'}`} key={option}>
                    <input
                      className="h-4 w-4 accent-cyan-300"
                      type="radio"
                      name="dialog-option"
                      value={option}
                      checked={dialog.value === option}
                      onChange={(event) => setDialog((current) => ({ ...current, value: event.target.value }))}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="btn btn-ghost" type="button" onClick={() => closeDialog(null)}>
                <FiX /> {dialog.cancelLabel || 'Annuler'}
              </button>
              <button className={`btn ${dialog.danger ? 'border border-rose-300/40 bg-rose-400 text-white hover:bg-rose-300' : 'btn-primary'}`} type="submit">
                <FiCheck /> {dialog.confirmLabel || 'Confirmer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => useContext(DialogContext);
