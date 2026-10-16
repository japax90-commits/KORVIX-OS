"use client";

import { Copy, MessageCircle, Printer } from "lucide-react";
import { useToast } from "@/components/ui/Feedback";
import { buttonClass } from "@/components/ui/Form";

/**
 * Impressão/PDF pelo navegador e compartilhamento por WhatsApp: abre o
 * WhatsApp com o resumo preenchido — o envio é feito pelo usuário; nada é
 * enviado automaticamente pelo sistema.
 */
export function ShareBar({ text }: { text: string }) {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className={buttonClass("primary", undefined, "sm")}><Printer size={14} /> Imprimir / salvar em PDF</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", undefined, "sm")}><MessageCircle size={14} /> Abrir no WhatsApp</a>
      <button
        type="button"
        onClick={async () => {
          try { await navigator.clipboard.writeText(text); toast("Resumo copiado."); } catch { toast("Não foi possível copiar. Selecione o texto manualmente.", "error"); }
        }}
        className={buttonClass("ghost", undefined, "sm")}
      ><Copy size={14} /> Copiar resumo</button>
    </div>
  );
}
