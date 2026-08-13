// Injected as a raw <script> in the document head, before hydration, so the
// correct theme class is on <html> for the very first paint. Keep this
// dependency-free (no imports) — it runs outside the React tree.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("relay-theme");
    var theme = stored === "light" || stored === "dark" ? stored : "system";
    var resolved =
      theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme;
    if (resolved === "dark") document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`
