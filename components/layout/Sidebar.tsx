"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { primaryNav, secondaryNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type NavItem = (typeof primaryNav)[number];

type SidebarProps = { allowedModules: string[]; isAdmin: boolean; onNavigate?: () => void };

function NavLink({ href, label, Icon, active, onNavigate }: { href: string; label: string; Icon: NavItem["icon"]; active: boolean; onNavigate?: () => void }) {
  return <Link href={href} onClick={onNavigate} className={cn("group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors", active ? "bg-korvix-800 text-white" : "text-korvix-200/80 hover:bg-korvix-800/60 hover:text-white")}>
    <Icon size={17} strokeWidth={2} className={cn(active ? "text-korvix-300" : "text-korvix-400/70")} />
    <span className="truncate">{label}</span>
  </Link>;
}

function SidebarContent({ allowedModules, isAdmin, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const visiblePrimary = primaryNav.filter((item) => allowedModules.includes(item.module));
  const visibleSecondary = secondaryNav.filter((item) => allowedModules.includes(item.module));
  return <div className="flex h-full flex-col bg-korvix-900">
    <div className="flex items-center gap-2.5 px-5 py-5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-korvix-400/20 ring-1 ring-inset ring-korvix-300/30"><span className="text-xs font-bold text-korvix-200">K</span></div><span className="text-[14px] font-semibold tracking-tight text-white">KORVIX <span className="text-korvix-300">OS</span></span></div>
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
      <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-korvix-400/60">Módulos</p>
      {visiblePrimary.map((item) => <NavLink key={item.href} href={item.href} label={item.label} Icon={item.icon} active={pathname.startsWith(item.href)} onNavigate={onNavigate} />)}
      {visibleSecondary.length > 0 && <><p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-wider text-korvix-400/60">Transversal</p>{visibleSecondary.map((item) => <NavLink key={item.href} href={item.href} label={item.label} Icon={item.icon} active={pathname.startsWith(item.href)} onNavigate={onNavigate} />)}</>}
    </nav>
    <div className="border-t border-korvix-800 px-5 py-4"><p className="text-[11px] leading-relaxed text-korvix-400/70">Sistema operacional comercial KORVIX OS<br />{isAdmin ? "Acesso administrativo" : "Operação integrada"}</p></div>
  </div>;
}

export function DesktopSidebar({ allowedModules, isAdmin }: { allowedModules: string[]; isAdmin: boolean }) {
  return <aside className="hidden w-[248px] shrink-0 lg:block"><div className="fixed h-screen w-[248px]"><SidebarContent allowedModules={allowedModules} isAdmin={isAdmin} /></div></aside>;
}

export function MobileSidebar({ open, onClose, allowedModules = [], isAdmin = false }: { open: boolean; onClose: () => void; allowedModules?: string[]; isAdmin?: boolean }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} /><div className="absolute inset-y-0 left-0 w-[80%] max-w-[280px] shadow-2xl"><div className="relative h-full"><button onClick={onClose} className="focus-ring absolute right-3 top-3 z-10 rounded-lg p-1.5 text-korvix-300 hover:bg-korvix-800" aria-label="Fechar menu"><X size={18} /></button><SidebarContent allowedModules={allowedModules} isAdmin={isAdmin} onNavigate={onClose} /></div></div></div>;
}
