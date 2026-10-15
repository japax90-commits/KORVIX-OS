"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_KEY } from "@/lib/theme/script";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";
const ORDER: Theme[] = ["light", "dark", "system"];
const META: Record<Theme, { label: string; Icon: typeof Sun }> = {
  light: { label: "Tema claro", Icon: Sun },
  dark: { label: "Tema escuro", Icon: Moon },
  system: { label: "Tema do sistema", Icon: Monitor },
};

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.theme = theme;
}

/** Alterna claro → escuro → sistema; a escolha fica salva neste navegador. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = (document.documentElement.dataset.theme as Theme) || "system";
    setTheme(ORDER.includes(saved) ? saved : "system");
    // Acompanha mudanças do sistema enquanto a preferência for "sistema".
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => document.documentElement.dataset.theme === "system" && apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function next() {
    const value = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(value);
    apply(value);
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      // Navegação privada: o tema vale apenas para esta aba.
    }
  }

  const { label, Icon } = META[theme];
  return (
    <button type="button" onClick={next} className={cn("focus-ring rounded-lg p-2 text-ink-600 hover:bg-ink-100 hover:text-ink-900", className)} aria-label={`${label} (clique para alternar)`} title={label}>
      <Icon size={18} />
    </button>
  );
}
