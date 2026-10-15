import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-100 px-6">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 text-center shadow-panel">
        <p className="text-sm font-semibold text-korvix-600">404</p>
        <h1 className="mt-2 text-xl font-semibold text-ink-900">Página não encontrada</h1>
        <p className="mt-1 text-sm text-ink-500">O endereço pode ter mudado ou o registro não existe mais.</p>
        <Link href="/" className="focus-ring mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg hover:bg-primary-hover">Voltar ao início</Link>
      </div>
    </div>
  );
}
