import React, { createContext, useContext, useMemo, useState } from "react";

const ToastCtx = createContext({ push: () => { } });
export const useToast = () => useContext(ToastCtx);

export default function ToastHost({ children }) {
    const [items, setItems] = useState([]);
    const push = (text, type = "ok", ms = 2400) => {
        const id = Math.random().toString(36).slice(2);
        setItems((x) => [...x, { id, text, type }]);
        setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), ms);
    };
    const value = useMemo(() => ({ push }), [items]);

    return (
        <ToastCtx.Provider value={value}>
            {children}
            <div className="toaster">
                <style>{`
          .toaster{position:fixed;right:16px;bottom:16px;display:flex;flex-direction:column;gap:8px;z-index:9999}
          .toast{background:var(--app-panel);border:1px solid #232838;color:#e8ecf2;border-radius:10px;padding:10px 12px;box-shadow:0 6px 16px rgba(0,0,0,.4);max-width:320px}
          .toast.ok{border-color:#2e7d52}
          .toast.err{border-color:#b23b3b}
        `}</style>
                {items.map((t) => (
                    <div key={t.id} className={`toast ${t.type}`}>{t.text}</div>
                ))}
            </div>
        </ToastCtx.Provider>
    );
}
