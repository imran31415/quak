// Apply the dark class before React mounts so the page doesn't flash white.
// Externalised from an inline <script> in index.html so it satisfies CSP
// (script-src 'self' 'wasm-unsafe-eval' — no inline / unsafe-inline).
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('quak-ui-store') || '{}');
    var t = (s.state || {}).theme || 'system';
    if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    // localStorage / JSON / matchMedia may be unavailable in some contexts; ignore.
  }
})();
