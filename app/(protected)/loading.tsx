/** Esqueleto exibido enquanto a página do módulo busca os dados no servidor. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" role="status" aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-6 w-56 rounded-lg bg-ink-200" />
        <div className="h-4 w-80 max-w-full rounded-lg bg-ink-200/70" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-xl bg-surface shadow-panel" />)}
      </div>
      <div className="h-72 rounded-xl bg-surface shadow-panel" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
