// js/components/mobileMenu.js
// Handles expanding/collapsing of mobile navigation menu drawer and updates accessibility states.

(function () {
  function bindMobileMenu() {
    const toggleBtn = document.getElementById('nav-toggle');
    const mobileMenuPanel = document.getElementById('mobile-menu');
    
    if (!toggleBtn || !mobileMenuPanel) return;

    function openMenu() {
      mobileMenuPanel.classList.remove('hidden');
      mobileMenuPanel.setAttribute('aria-hidden', 'false');
      // force reflow
      void mobileMenuPanel.offsetHeight;
      mobileMenuPanel.classList.add('open');
      toggleBtn.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      mobileMenuPanel.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      mobileMenuPanel.setAttribute('aria-hidden', 'true');
      
      const onEnd = (e) => {
        if (e.target === mobileMenuPanel) {
          mobileMenuPanel.removeEventListener('transitionend', onEnd);
          if (!mobileMenuPanel.classList.contains('open')) {
            mobileMenuPanel.classList.add('hidden');
          }
        }
      };
      
      mobileMenuPanel.addEventListener('transitionend', onEnd);
      // fallback timeout
      setTimeout(() => {
        mobileMenuPanel.removeEventListener('transitionend', onEnd);
        if (!mobileMenuPanel.classList.contains('open')) {
          mobileMenuPanel.classList.add('hidden');
        }
      }, 250);
    }

    toggleBtn.replaceWith(toggleBtn.cloneNode(true));
    const newToggle = document.getElementById('nav-toggle');

    newToggle.addEventListener('click', () => {
      const isOpen = mobileMenuPanel.classList.contains('open') && !mobileMenuPanel.classList.contains('hidden');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Automatically close mobile menu when clicking any nav links inside it
    mobileMenuPanel.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindMobileMenu);
  } else {
    bindMobileMenu();
  }

  document.addEventListener('nav-footer-rendered', bindMobileMenu);
})();
