// js/components/themeToggle.js
// Handles Light / Dark theme toggling for Warm Editorial design system.

(function () {
  function applyInitialTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = localStorage.getItem('color-theme');
    const isDark = stored === 'dark' || (!stored && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
    
    // Update theme toggle icons (desktop & mobile)
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');
    if (lightIcon && darkIcon) {
      lightIcon.classList.toggle('hidden', !isDark);
      darkIcon.classList.toggle('hidden', isDark);
    }
    
    const darkIconM = document.getElementById('theme-toggle-dark-icon-mobile');
    const lightIconM = document.getElementById('theme-toggle-light-icon-mobile');
    if (lightIconM && darkIconM) {
      lightIconM.classList.toggle('hidden', !isDark);
      darkIconM.classList.toggle('hidden', isDark);
    }
  }

  function bindThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleBtnM = document.getElementById('theme-toggle-mobile-header');
    
    function toggle() {
      const isDark = document.documentElement.classList.contains('dark');
      const nextDark = !isDark;
      
      document.documentElement.classList.toggle('dark', nextDark);
      localStorage.setItem('color-theme', nextDark ? 'dark' : 'light');
      
      // Update icons
      const darkIcon = document.getElementById('theme-toggle-dark-icon');
      const lightIcon = document.getElementById('theme-toggle-light-icon');
      if (darkIcon && lightIcon) {
        darkIcon.classList.toggle('hidden', nextDark);
        lightIcon.classList.toggle('hidden', !nextDark);
      }
      
      const darkIconM = document.getElementById('theme-toggle-dark-icon-mobile');
      const lightIconM = document.getElementById('theme-toggle-light-icon-mobile');
      if (darkIconM && lightIconM) {
        darkIconM.classList.toggle('hidden', nextDark);
        lightIconM.classList.toggle('hidden', !nextDark);
      }

      if (themeToggleBtn) {
        themeToggleBtn.setAttribute('aria-pressed', String(nextDark));
      }
    }

    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('aria-pressed', String(document.documentElement.classList.contains('dark')));
      // Remove old listeners to avoid duplicates
      themeToggleBtn.replaceWith(themeToggleBtn.cloneNode(true));
      const newBtn = document.getElementById('theme-toggle');
      newBtn.addEventListener('click', toggle);
    }

    if (themeToggleBtnM) {
      themeToggleBtnM.replaceWith(themeToggleBtnM.cloneNode(true));
      const newBtnM = document.getElementById('theme-toggle-mobile-header');
      newBtnM.addEventListener('click', toggle);
    }
  }

  // Auto-init
  applyInitialTheme();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyInitialTheme();
      bindThemeToggle();
    });
  } else {
    applyInitialTheme();
    bindThemeToggle();
  }

  document.addEventListener('nav-footer-rendered', () => {
    applyInitialTheme();
    bindThemeToggle();
  });
})();
