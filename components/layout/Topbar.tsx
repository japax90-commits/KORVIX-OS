"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, Bell, ChevronDown } from "lucide-react";
import { currentUser, notifications } from "@/lib/mock-data";
import { primaryNav, secondaryNav } from "@/lib/navigation";
import { MobileSidebar } from "./Sidebar";

export function Topbar({
  allowedModules,
  isAdmin,
}: {
  allowedModules: string[];
  isAdmin: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = notifications.filter((n) => !n.readAt).length;
  const pathname = usePathname();
  const pageTitle =
    [...primaryNav, ...secondaryNav].find((item) =>
      pathname.startsWith(item.href)
    )?.label ?? "KORVIX OS";

  return (
    <>
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        allowedModules={allowedModules}
        isAdmin={isAdmin}
      />

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <button
          onClick={() => setMobileOpen(true)}
          className="focus-ring rounded-lg p-1.5 text-ink-700 hover:bg-ink-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <h1 className="truncate text-[15px] font-semibold text-ink-900 lg:text-base">
          {pageTitle}
        </h1>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            className="focus-ring hidden items-center gap-2 rounded-lg border border-ink-300 px-3 py-1.5 text-sm text-ink-500 hover:border-korvix-300 sm:flex"
            aria-label="Busca global"
          >
            <Search size={15} />
            <span className="text-xs">Buscar…</span>
            <kbd className="ml-4 rounded border border-ink-300 bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-500">
              ⌘K
            </kbd>
          </button>

          <button
            className="focus-ring rounded-lg p-2 text-ink-700 hover:bg-ink-100 sm:hidden"
            aria-label="Busca global"
          >
            <Search size={18} />
          </button>

          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="focus-ring relative rounded-lg p-2 text-ink-700 hover:bg-ink-100"
              aria-label="Notificações"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-[320px] rounded-xl border border-ink-100 bg-white shadow-panel">
                <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                  <p className="text-sm font-semibold text-ink-900">Notificações</p>
                  <span className="text-xs text-korvix-600">{unread} não lidas</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="border-b border-ink-100 px-4 py-3 last:border-0 hover:bg-korvix-50/60">
                      <div className="flex items-start gap-2">
                        {!n.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-korvix-500" />}
                        <div className={n.readAt ? "pl-3.5" : ""}>
                          <p className="text-[13px] font-medium text-ink-900">{n.title}</p>
                          <p className="mt-0.5 text-xs text-ink-500">{n.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="ml-1 flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-ink-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-korvix-900 text-xs font-semibold text-korvix-200">
              {currentUser.avatarInitials}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-[13px] font-medium text-ink-900">{currentUser.name}</p>
              <p className="text-[11px] text-ink-500">{currentUser.role === "ceo" ? "CEO" : currentUser.role}</p>
            </div>
            <ChevronDown size={14} className="hidden text-ink-500 sm:block" />
          </div>
        </div>
      </header>
    </>
  );
}
