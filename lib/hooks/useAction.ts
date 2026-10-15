"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { error?: { message: string } | null } | void;
export type FieldErrors = Record<string, string>;

/**
 * Executa uma mutação (Supabase) com estado de carregamento e erro padronizados
 * e, em caso de sucesso, revalida os Server Components da rota (router.refresh)
 * para que a interface reflita o dado salvo sem recarregar a página inteira.
 *
 * - Ignora novos envios enquanto um está em andamento (duplo clique / Enter).
 * - Erros de validação podem ser associados a campos (fieldErrors).
 */
export function useAction() {
  const router = useRouter();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setErrorState] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [refreshing, startTransition] = useTransition();

  const setError = useCallback((message: string) => setErrorState(message), []);

  /** Registra erros por campo; retorna false para uso em `return fail(...)`. */
  const fail = useCallback((errors: FieldErrors) => {
    setFieldErrors(errors);
    setErrorState(Object.keys(errors).length > 1 ? "Corrija os campos destacados." : "");
    return false;
  }, []);

  const run = useCallback(
    async (fn: () => Promise<Result>, opts?: { onSuccess?: () => void }) => {
      if (running.current) return false;
      running.current = true;
      setBusy(true);
      setErrorState("");
      setFieldErrors({});
      try {
        const result = await fn();
        if (result && result.error) {
          setErrorState(friendlyError(result.error.message));
          return false;
        }
        opts?.onSuccess?.();
        startTransition(() => router.refresh());
        return true;
      } catch (e) {
        setErrorState(friendlyError(e instanceof Error ? e.message : "Erro inesperado."));
        return false;
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [router],
  );

  return { run, busy: busy || refreshing, error, setError, fieldErrors, fail };
}

/** Handler de submit que nunca recarrega a página nem limpa os campos. */
export function onSubmitForm(handler: (fd: FormData) => unknown) {
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handler(new FormData(event.currentTarget));
  };
}

/** Traduz mensagens técnicas comuns do Postgres/PostgREST para o usuário. */
export function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("row-level security") || m.includes("permission denied") || m.includes("sem permissão"))
    return "Você não tem permissão para realizar esta ação.";
  if (m.includes("violates foreign key"))
    return "Este registro está vinculado a outros dados (ex.: pagamentos) e não pode ser excluído.";
  if (m.includes("violates not-null")) return "Preencha todos os campos obrigatórios.";
  if (m.includes("duplicate key")) return "Já existe um registro com esses dados.";
  if (m.includes("jwt") || m.includes("not authenticated") || m.includes("auth session missing")) return "Sua sessão expirou. Entre novamente para continuar.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Falha de conexão. Verifique a internet e tente novamente.";
  return message;
}
