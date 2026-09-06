"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const value = email.trim();
    if (!value) {
      setError("Informe seu e-mail.");
      setSaving(false);
      return;
    }

    const { error: resetError } = await createClient().auth.resetPasswordForEmail(value, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError("Não foi possível enviar o e-mail de recuperação. Tente novamente.");
    } else {
      setSent(true);
    }
    setSaving(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-100 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm ring-1 ring-ink-200">
        <div className="mb-7 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-korvix-900"><span className="text-sm font-bold text-korvix-200">K</span></div>
          <span className="text-[15px] font-semibold tracking-tight text-ink-900">KORVIX <span className="text-korvix-600">OS</span></span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-korvix-50 text-korvix-700"><Mail size={20}/></div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-900">Recuperar senha</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">Informe seu e-mail interno e enviaremos um link seguro para criar uma nova senha.</p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            E-mail de recuperação enviado. Verifique sua caixa de entrada e siga o link recebido.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700">E-mail</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="voce@korvixdigital.com" className="focus-ring w-full rounded-lg border border-ink-300 px-3.5 py-2.5 text-[15px]" required />
            </div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={saving} className="focus-ring w-full rounded-lg bg-korvix-900 px-4 py-2.5 text-[15px] font-medium text-white hover:bg-korvix-800">{saving ? "Enviando..." : "Enviar link de recuperação"}</button>
          </form>
        )}

        <Link href="/login" className="mt-7 flex items-center justify-center gap-2 text-sm font-medium text-korvix-700 hover:text-korvix-800"><ArrowLeft size={15}/> Voltar para o login</Link>
        <p className="mt-7 flex items-center justify-center gap-1.5 text-xs text-ink-500"><ShieldCheck size={13}/> Recuperação protegida pelo Supabase Auth.</p>
      </div>
    </div>
  );
}
