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
