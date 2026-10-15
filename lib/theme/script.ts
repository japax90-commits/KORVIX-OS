// Executado no <head> antes da primeira pintura: aplica tema e estado do menu
// lateral salvos no navegador, evitando "flash" de tema ou de layout.
export const THEME_KEY = "korvix-theme"; // "light" | "dark" | "system"
export const SIDEBAR_KEY = "korvix-sidebar"; // "collapsed" | "expanded"

export const preferencesScript = `(() => {
  try {
    var d = document.documentElement;
    var t = localStorage.getItem("${THEME_KEY}") || "system";
    var dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    d.classList.toggle("dark", dark);
    d.dataset.theme = t;
    if (localStorage.getItem("${SIDEBAR_KEY}") === "collapsed") d.dataset.sidebar = "collapsed";
  } catch (e) {}
})();`;
