// js/components/toast.js
// Lightweight toast notification system styled in Warm Editorial design tokens.

(function () {
  function ensureContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position: fixed; top: var(--space-4); right: var(--space-4); z-index: 9999; display: flex; flex-direction: column; gap: var(--space-2);';
      document.body.appendChild(container);
    }
    return container;
  }

  function getToastColorClass(type) {
    if (type === 'error') return { bg: 'var(--danger)', fg: 'var(--accent-on)' };
    if (type === 'warning') return { bg: 'var(--warn)', fg: 'var(--accent-on)' };
    if (type === 'info') return { bg: 'var(--surface-warm)', fg: 'var(--fg)' };
    return { bg: 'var(--success)', fg: 'var(--accent-on)' };
  }

  function show(message, type = 'success', duration = 3000) {
    const box = document.createElement('div');
    const colors = getToastColorClass(type);
    
    box.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: 12px 20px;
      border-radius: var(--radius-sm);
      background-color: ${colors.bg};
      color: ${colors.fg};
      box-shadow: var(--elev-raised);
      font-size: var(--text-sm);
      font-family: var(--font-body);
      line-height: var(--leading-body);
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity var(--motion-fast) var(--ease-standard), transform var(--motion-fast) var(--ease-standard);
      pointer-events: auto;
    `;
    
    box.setAttribute('role', 'status');
    box.innerHTML = `
      <div>${message}</div>
      <button type="button" aria-label="關閉" style="background: transparent; border: none; color: currentColor; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: var(--space-1); opacity: 0.8; transition: opacity var(--motion-fast) var(--ease-standard);">
        <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>`;
      
    const container = ensureContainer();
    container.appendChild(box);
    
    // Trigger entry transition
    void box.offsetWidth;
    box.style.opacity = '1';
    box.style.transform = 'translateY(0)';

    let timer = null; 
    let remaining = duration; 
    let start = Date.now();
    
    function close() { 
      box.style.opacity = '0';
      box.style.transform = 'translateY(-10px)';
      box.addEventListener('transitionend', () => {
        if (box.parentNode) box.parentNode.removeChild(box);
      });
      // fallback
      setTimeout(() => {
        if (box.parentNode) box.parentNode.removeChild(box);
      }, 300);
    }
    
    function startTimer() { 
      start = Date.now(); 
      timer = setTimeout(close, remaining); 
    }
    
    function pauseTimer() { 
      if (timer) { 
        clearTimeout(timer); 
        timer = null; 
        remaining -= (Date.now() - start); 
      } 
    }
    
    startTimer();

    box.addEventListener('mouseenter', pauseTimer);
    box.addEventListener('mouseleave', () => { 
      if (!timer) startTimer(); 
    });
    
    const closeBtn = box.querySelector('button');
    if (closeBtn) {
      closeBtn.addEventListener('mouseenter', () => { closeBtn.style.opacity = '1'; });
      closeBtn.addEventListener('mouseleave', () => { closeBtn.style.opacity = '0.8'; });
      closeBtn.addEventListener('click', () => { 
        pauseTimer(); 
        close(); 
      });
    }

    return { close };
  }

  window.Toast = { show };
})();
