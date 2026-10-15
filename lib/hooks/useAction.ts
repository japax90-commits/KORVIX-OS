"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { error?: { message: string } | null } | void;

/**
 * Executa uma mutação (Supabase) com estado de carregamento e erro padronizados
 * e, em caso de sucesso, revalida os Server Components da rota (router.refresh)
 * para que a interface reflita o dado salvo sem recarregar a página inteira.
 */
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, startTransition] = useTransition();

  const run = useCallback(
    async (fn: () => Promise<Result>, opts?: { onSuccess?: () => void }) => {
      setBusy(true);
      setError("");
      try {
        const result = await fn();
        if (result && result.error) {
          setError(friendlyError(result.error.message));
          return false;
        }
        opts?.onSuccess?.();
        startTransition(() => router.refresh());
        return true;
      } catch (e) {
        setError(friendlyError(e instanceof Error ? e.message : "Erro inesperado."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return { run, busy: busy || refreshing, error, setError };
}

/** Traduz mensagens técnicas comuns do Postgres/PostgREST para o usuário. */
export function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("row-level security") || m.includes("permission denied") || m.includes("sem permissão"))
    return "Você não tem permissão para realizar esta ação.";
  if (m.includes("violates foreign key"))
    return "Este registro está vinculado a outros dados (ex.: pagamentos) e não pode ser excluído.";
  if (m.includes("violates not-null")) return "Preencha todos os campos obrigatórios.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Falha de conexão. Verifique a internet e tente novamente.";
  return message;
}
