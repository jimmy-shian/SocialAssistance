// js/components/modal.js
// Shared helper utility to manage UI Modal overlay visibility, background scrolling lock, and click-away closers.

(function () {
  function initModals() {
    // Utility to show a modal
    window.UIModal = {
      show: function (modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const overlay = modal.querySelector('.ui-modal-overlay');
        const content = modal.querySelector('.ui-modal-content');
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock background scroll
        
        void modal.offsetWidth; // Force reflow
        
        if (overlay) overlay.classList.add('open');
        if (content) content.classList.add('open');
        
        // Trap focus if close button exists
        const closeBtn = modal.querySelector('[data-close-modal], .modal-close-btn, [data-close-survey]');
        if (closeBtn) {
          setTimeout(() => closeBtn.focus(), 50);
        }
      },
      close: function (modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const overlay = modal.querySelector('.ui-modal-overlay');
        const content = modal.querySelector('.ui-modal-content');
        
        if (overlay) overlay.classList.remove('open');
        if (content) content.classList.remove('open');
        
        document.body.style.overflow = ''; // Unlock scroll
        
        const onEnd = () => {
          modal.classList.add('hidden');
          modal.removeEventListener('transitionend', onEnd);
        };
        
        modal.addEventListener('transitionend', onEnd);
        // fallback
        setTimeout(() => {
          modal.classList.add('hidden');
        }, 250);
      }
    };

    // Global click listener to close modals marked with data-close-modal or modal-overlay clicks
    document.addEventListener('click', function (e) {
      if (e.target.matches('[data-close-modal]')) {
        const modal = e.target.closest('.modal-container, #survey-modal, #create-survey-modal');
        if (modal) {
          window.UIModal.close(modal.id);
        }
      }
    });

    // Close on Escape key press
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal-container:not(.hidden), #survey-modal:not(.hidden), #create-survey-modal:not(.hidden)');
        if (openModal) {
          window.UIModal.close(openModal.id);
        }
      }
    });
  }

  initModals();
})();
