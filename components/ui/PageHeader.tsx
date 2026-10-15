import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Cabeçalho padrão de página: título + descrição à esquerda, ações à direita (empilha no celular). */
export type Crumb = { label: string; href?: string };

export function PageHeader({ title, description, actions, breadcrumbs }: { title: string; description?: string; actions?: React.ReactNode; breadcrumbs?: Crumb[] }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Você está em" className="mb-1.5">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-500">
              {breadcrumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={12} className="text-ink-400" aria-hidden />}
                  {c.href ? <Link href={c.href} className="hover:text-ink-900 hover:underline">{c.label}</Link> : <span aria-current="page" className="text-ink-700">{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h2 className="break-words text-xl font-semibold tracking-tight text-ink-900 sm:text-[22px]">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorState({ title = "Não foi possível carregar os dados", message }: { title?: string; message?: string }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
      <p className="font-medium">{title}</p>
      {message && <p className="mt-1 text-danger/90">{message}</p>}
    </div>
  );
}

export function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-ink-700">
      {icon && <span className="text-korvix-600">{icon}</span>}
      <h3 className="text-sm font-semibold text-ink-900">{children}</h3>
    </div>
  );
}
