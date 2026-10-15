"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { primaryNav, secondaryNav } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { signOut } from "@/app/actions/auth";
import { MobileSidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";

export type TopbarUser = { name: string; email: string; roleLabel: string; initials: string };
export type TopbarNotification = { id: string; title: string; body: string; read_at: string | null; created_at: string };

function useClickOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function Topbar({
  allowedModules,
  isAdmin,
  user,
  notifications,
}: {
  allowedModules: string[];
  isAdmin: boolean;
  user: TopbarUser;
  notifications: TopbarNotification[];
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const notifRef = useClickOutside(notifOpen, () => setNotifOpen(false));
  const userRef = useClickOutside(userOpen, () => setUserOpen(false));
  const unread = items.filter((n) => !n.read_at).length;
  const pathname = usePathname();
  const pageTitle = [...primaryNav, ...secondaryNav].find((item) => pathname.startsWith(item.href))?.label ?? "KORVIX OS";

  useEffect(() => setItems(notifications), [notifications]);
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function markAllRead() {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    const { error } = await createClient().from("notifications").update({ read_at: now }).in("id", ids);
    if (!error) {
      setItems((current) => current.map((n) => (n.read_at ? n : { ...n, read_at: now })));
      router.refresh();
    }
  }

  return (
    <>
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} allowedModules={allowedModules} isAdmin={isAdmin} />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} allowedModules={allowedModules} />

      <header className="sticky top-0 z-30 flex h-[61px] items-center gap-3 border-b border-ink-200 bg-surface/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <button onClick={() => setMobileOpen(true)} className="focus-ring -ml-1 rounded-lg p-1.5 text-ink-700 hover:bg-ink-100 lg:hidden" aria-label="Abrir menu">
          <Menu size={20} />
        </button>

        <h1 className="min-w-0 truncate text-[15px] font-semibold text-ink-900 lg:text-base">{pageTitle}</h1>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button onClick={() => setSearchOpen(true)} className="focus-ring hidden items-center gap-2 rounded-lg border border-ink-300 px-3 py-1.5 text-sm text-ink-500 hover:border-korvix-300 sm:flex" aria-label="Buscar módulo">
            <Search size={15} />
            <span className="text-xs">Buscar…</span>
            <kbd className="ml-4 rounded border border-ink-300 bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-500">⌘K</kbd>
          </button>
          <button onClick={() => setSearchOpen(true)} className="focus-ring rounded-lg p-2 text-ink-700 hover:bg-ink-100 sm:hidden" aria-label="Buscar módulo">
            <Search size={18} />
          </button>

          <ThemeToggle />

          <div className="relative" ref={notifRef}>
            <button onClick={() => setNotifOpen((v) => !v)} className="focus-ring relative rounded-lg p-2 text-ink-700 hover:bg-ink-100" aria-label={`Notificações (${unread} não lidas)`} aria-expanded={notifOpen}>
              <Bell size={18} />
              {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
            </button>
            {notifOpen && (
              <div className="fixed inset-x-3 top-16 z-40 rounded-xl border border-ink-200 bg-surface shadow-panel sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[340px]">
                <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                  <p className="text-sm font-semibold text-ink-900">Notificações</p>
                  {unread > 0 ? (
                    <button onClick={markAllRead} className="text-xs font-medium text-korvix-600 hover:text-korvix-800">Marcar todas como lidas</button>
                  ) : (
                    <span className="text-xs text-ink-500">Tudo em dia</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {items.map((n) => (
                    <div key={n.id} className="border-b border-ink-100 px-4 py-3 last:border-0">
                      <div className="flex items-start gap-2">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-korvix-500"}`} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink-900">{n.title}</p>
                          <p className="mt-0.5 text-xs text-ink-500">{n.body}</p>
                          <p className="mt-1 text-[11px] text-ink-400">{formatDateTime(n.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-500">Nenhuma notificação.</p>}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userRef}>
            <button onClick={() => setUserOpen((v) => !v)} className="focus-ring ml-1 flex items-center gap-2 rounded-lg py-1 pl-1 pr-1 hover:bg-ink-100 sm:pr-2" aria-label="Menu do usuário" aria-expanded={userOpen}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-korvix-900 text-xs font-semibold text-korvix-200">{user.initials}</span>
              <span className="hidden max-w-[160px] text-left leading-tight sm:block">
                <span className="block truncate text-[13px] font-medium text-ink-900">{user.name}</span>
                <span className="block text-[11px] text-ink-500">{user.roleLabel}</span>
              </span>
              <ChevronDown size={14} className="hidden text-ink-500 sm:block" />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-xl border border-ink-200 bg-surface p-1.5 shadow-panel">
                <div className="px-3 py-2.5">
                  <p className="truncate text-sm font-medium text-ink-900">{user.name}</p>
                  <p className="truncate text-xs text-ink-500">{user.email}</p>
                </div>
                <form action={signOut}>
                  <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-danger/10 hover:text-danger">
                    <LogOut size={15} /> Sair
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
