"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, X } from "lucide-react";
import { primaryNav, secondaryNav } from "@/lib/navigation";
import { SIDEBAR_KEY } from "@/lib/theme/script";
import { cn } from "@/lib/utils";

type NavItem = (typeof primaryNav)[number];
type SidebarProps = { allowedModules: string[]; isAdmin: boolean; onNavigate?: () => void; collapsible?: boolean };

// Recolhido = atributo data-sidebar="collapsed" no <html> (definido antes da
// pintura pelo script de preferências). As classes usam o variante
// [html[data-sidebar=collapsed]_&]: escrito por extenso para o Tailwind gerá-las.

function NavLink({ item, active, onNavigate, collapsible }: { item: NavItem; active: boolean; onNavigate?: () => void; collapsible?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
        active ? "bg-white/10 text-white" : "text-korvix-200/75 hover:bg-white/5 hover:text-white",
        collapsible && `[html[data-sidebar=collapsed]_&]:justify-center [html[data-sidebar=collapsed]_&]:px-0`,
      )}
    >
      {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-korvix-400" aria-hidden />}
      <Icon size={18} strokeWidth={2} className={cn("shrink-0", active ? "text-korvix-300" : "text-korvix-300/60 group-hover:text-korvix-300")} />
      <span className={cn("truncate", collapsible && `[html[data-sidebar=collapsed]_&]:sr-only`)}>{item.label}</span>
    </Link>
  );
}

function SectionLabel({ children, collapsible }: { children: React.ReactNode; collapsible?: boolean }) {
  return <p className={cn("px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-korvix-300/80 first:pt-2", collapsible && `[html[data-sidebar=collapsed]_&]:sr-only`)}>{children}</p>;
}

function SidebarContent({ allowedModules, isAdmin, onNavigate, collapsible }: SidebarProps) {
  const pathname = usePathname();
  const visiblePrimary = primaryNav.filter((item) => allowedModules.includes(item.module));
  const visibleSecondary = secondaryNav.filter((item) => allowedModules.includes(item.module));

  function toggle() {
    const collapsed = document.documentElement.dataset.sidebar !== "collapsed";
    if (collapsed) document.documentElement.dataset.sidebar = "collapsed";
    else delete document.documentElement.dataset.sidebar;
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
    } catch {
      // Sem armazenamento: vale só para esta aba.
    }
  }

  return (
    <div className="flex h-full flex-col bg-nav">
      <div className={cn("flex h-[61px] items-center gap-2.5 border-b border-white/5 px-5", collapsible && `[html[data-sidebar=collapsed]_&]:justify-center [html[data-sidebar=collapsed]_&]:px-0`)}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-korvix-400/20 ring-1 ring-inset ring-korvix-300/30">
          <span className="text-xs font-bold text-korvix-200">K</span>
        </div>
        <span className={cn("text-[14px] font-semibold tracking-tight text-white", collapsible && `[html[data-sidebar=collapsed]_&]:sr-only`)}>
          KORVIX <span className="text-korvix-300">OS</span>
        </span>
      </div>
      <nav aria-label="Módulos" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <SectionLabel collapsible={collapsible}>Módulos</SectionLabel>
        {visiblePrimary.map((item) => <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} onNavigate={onNavigate} collapsible={collapsible} />)}
        {visibleSecondary.length > 0 && (
          <>
            <SectionLabel collapsible={collapsible}>Transversal</SectionLabel>
            {visibleSecondary.map((item) => <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} onNavigate={onNavigate} collapsible={collapsible} />)}
          </>
        )}
      </nav>
      <div className="border-t border-white/5 p-3">
        {collapsible ? (
          <button type="button" onClick={toggle} className={cn("focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-korvix-200/70 hover:bg-white/5 hover:text-white", `[html[data-sidebar=collapsed]_&]:justify-center [html[data-sidebar=collapsed]_&]:px-0`)} aria-label="Recolher ou expandir menu" title="Recolher/expandir menu">
            <ChevronsLeft size={16} className={`shrink-0 transition-transform [html[data-sidebar=collapsed]_&]:rotate-180`} />
            <span className={`[html[data-sidebar=collapsed]_&]:sr-only`}>Recolher menu</span>
          </button>
        ) : (
          <p className="px-2 text-[11px] leading-relaxed text-korvix-300/60">{isAdmin ? "Acesso administrativo" : "Operação integrada"}</p>
        )}
      </div>
    </div>
  );
}

export function DesktopSidebar({ allowedModules, isAdmin }: { allowedModules: string[]; isAdmin: boolean }) {
  return (
    <aside className={`hidden w-[248px] shrink-0 transition-[width] duration-200 lg:block [html[data-sidebar=collapsed]_&]:w-[72px]`}>
      <div className={`fixed inset-y-0 w-[248px] transition-[width] duration-200 [html[data-sidebar=collapsed]_&]:w-[72px]`}>
        <SidebarContent allowedModules={allowedModules} isAdmin={isAdmin} collapsible />
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onClose, allowedModules = [], isAdmin = false }: { open: boolean; onClose: () => void; allowedModules?: string[]; isAdmin?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Menu de navegação" className="absolute inset-y-0 left-0 w-[82%] max-w-[300px] shadow-overlay">
        <div className="relative h-full">
          <button onClick={onClose} className="focus-ring absolute right-3 top-3.5 z-10 rounded-lg p-1.5 text-korvix-200 hover:bg-white/10" aria-label="Fechar menu">
            <X size={18} />
          </button>
          <SidebarContent allowedModules={allowedModules} isAdmin={isAdmin} onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
