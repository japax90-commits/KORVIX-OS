"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" } as const;

/**
 * Modal padrão do KORVIX OS: centralizado no desktop, ancorado embaixo no
 * celular, com rolagem interna, fechamento por Esc / clique fora e foco
 * preservado na página (body sem scroll enquanto aberto).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: keyof typeof sizes;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusables = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? []);
    // Foco inicial: primeiro campo do formulário (ou o próprio diálogo).
    const firstField = dialog?.querySelector<HTMLElement>("input:not([type=hidden]),select,textarea");
    (firstField ?? dialog)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeRef.current();
      if (e.key !== "Tab") return;
      // Mantém o Tab dentro do modal.
      const items = focusables();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      // Devolve o foco ao botão que abriu o modal.
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-2xl outline-none sm:max-h-[88dvh] sm:rounded-2xl",
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-semibold text-ink-900 sm:text-lg">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="focus-ring -mr-1.5 rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-ink-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}
