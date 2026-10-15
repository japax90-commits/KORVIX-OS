"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { buttonClass } from "@/components/ui/Form";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; tone: ToastTone; message: string };
type ConfirmOptions = { title?: string; description: string; confirmLabel?: string; tone?: "danger" | "default" };

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);
const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Notificações (toasts) e diálogo de confirmação compartilhados pela área logada. */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, tone, message }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);

  function settle(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-3 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:items-end">
          {toasts.map((t) => {
            const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? AlertTriangle : Info;
            return (
              <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-ink-200 bg-surface px-4 py-3 text-sm text-ink-900 shadow-overlay">
                <Icon size={17} className={cn("mt-0.5 shrink-0", t.tone === "success" ? "text-success" : t.tone === "error" ? "text-danger" : "text-info")} />
                <span className="min-w-0 flex-1">{t.message}</span>
                <button type="button" onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))} className="rounded p-0.5 text-ink-400 hover:text-ink-900" aria-label="Fechar notificação"><X size={14} /></button>
              </div>
            );
          })}
        </div>
        {pending && <ConfirmDialog options={pending} onSettle={settle} />}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

function ConfirmDialog({ options, onSettle }: { options: ConfirmOptions; onSettle: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    // Foco inicial no "Cancelar": a opção segura para ações destrutivas.
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onSettle(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [onSettle]);
  const danger = options.tone !== "default";
  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/55 p-4 backdrop-blur-[2px] sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onSettle(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-desc" className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-overlay">
        <div className="flex gap-4">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", danger ? "bg-danger/10 text-danger" : "bg-korvix-100 text-korvix-600")}>
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <h3 id="confirm-title" className="text-base font-semibold text-ink-900">{options.title ?? (danger ? "Confirmar exclusão" : "Confirmar ação")}</h3>
            <p id="confirm-desc" className="mt-1 text-sm text-ink-600">{options.description}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={() => onSettle(false)} className={buttonClass("secondary")}>Cancelar</button>
          <button type="button" onClick={() => onSettle(true)} className={buttonClass(danger ? "danger" : "primary")}>{options.confirmLabel ?? (danger ? "Excluir" : "Confirmar")}</button>
        </div>
      </div>
    </div>
  );
}

/** Mostra uma notificação. Fora do provedor, não faz nada (nunca finge sucesso). */
export function useToast() {
  return useContext(ToastContext) ?? (() => {});
}

/** Pede confirmação com o diálogo do sistema de design (fallback: confirm nativo). */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  return ctx ?? ((o: ConfirmOptions) => Promise.resolve(window.confirm(o.description)));
}
