"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/ui/Form";

/** Erro inesperado ao renderizar um módulo: mantém o layout e permite tentar de novo. */
export default function ModuleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-panel">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-danger"><AlertTriangle size={20} /></div>
      <h2 className="mt-4 text-lg font-semibold text-ink-900">Não foi possível exibir esta página</h2>
      <p className="mt-1 text-sm text-ink-500">Ocorreu um erro inesperado. Nenhuma alteração foi feita nos seus dados.</p>
      {error.digest && <p className="mt-2 text-xs text-ink-400">Código: {error.digest}</p>}
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <button onClick={reset} className={buttonClass("primary")}><RotateCcw size={15} /> Tentar novamente</button>
        <Link href="/" className={buttonClass("secondary")}>Ir para o início</Link>
      </div>
    </div>
  );
}
