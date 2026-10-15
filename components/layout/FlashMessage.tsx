"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

/** Exibe mensagens passadas por redirecionamento (?error= / ?message=) e limpa a URL. */
export function FlashMessage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [flash, setFlash] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    const error = params.get("error");
    const message = params.get("message");
    if (!error && !message) return;
    setFlash(error ? { tone: "error", text: error } : { tone: "info", text: message! });
    const next = new URLSearchParams(params.toString());
    next.delete("error");
    next.delete("message");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  if (!flash) return null;
  return (
    <div role={flash.tone === "error" ? "alert" : "status"} className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${flash.tone === "error" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-green-200 bg-green-50 text-green-800"}`}>
      <span>{flash.text}</span>
      <button type="button" onClick={() => setFlash(null)} aria-label="Fechar aviso" className="rounded p-0.5 opacity-70 hover:opacity-100"><X size={15} /></button>
    </div>
  );
}
