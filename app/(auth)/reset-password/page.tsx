"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError("Não foi possível atualizar a senha. Solicite um novo link de recuperação.");
    } else {
      setDone(true);
      await createClient().auth.signOut();
      setTimeout(() => router.push("/login?error=Senha%20atualizada%20com%20sucesso"), 900);
    }
    setSaving(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-100 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm ring-1 ring-ink-200">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-korvix-900"><span className="text-sm font-bold text-korvix-200">K</span></div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink-900">Criar nova senha</h1>
        <p className="mt-1.5 text-sm text-ink-500">Defina uma nova senha para acessar o KORVIX OS.</p>
        {!ready ? (
          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Link de recuperação inválido ou expirado. Solicite um novo link.</div>
        ) : done ? (
          <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">Senha atualizada. Redirecionando para o login...</div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <div><label className="mb-1.5 block text-sm font-medium text-ink-700">Nova senha</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="w-full rounded-lg border border-ink-300 px-3.5 py-2.5" required /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-ink-700">Confirmar senha</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="w-full rounded-lg border border-ink-300 px-3.5 py-2.5" required /></div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={saving} className="w-full rounded-lg bg-korvix-900 px-4 py-2.5 font-medium text-white">{saving ? "Atualizando..." : "Atualizar senha"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
