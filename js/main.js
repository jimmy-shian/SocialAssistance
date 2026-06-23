// Global behavior kept intentionally small for the single light theme redesign.
(function () {
  document.documentElement.classList.remove('dark');
  try { localStorage.removeItem('color-theme'); } catch (e) {}
})();
