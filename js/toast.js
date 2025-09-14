// Lightweight toast system shown at top-right, with dark/light support
(function(){
  function ensureContainer(){
    let c = document.getElementById('toast-container');
    if (!c){
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2';
      document.body.appendChild(c);
    }
    return c;
  }
  function clazz(type){
    // type: success | error | warning | info
    if (type === 'error') return 'bg-rose-600 text-white dark:bg-rose-500';
    if (type === 'warning') return 'bg-amber-500 text-white dark:bg-amber-400';
    if (type === 'info') return 'bg-sky-600 text-white dark:bg-sky-500';
    return 'bg-green-600 text-white dark:bg-green-500';
  }
  function show(message, type='success', duration=3000){
    const box = document.createElement('div');
    box.className = `toast pointer-events-auto select-none shadow-lg rounded px-4 py-3 text-sm flex items-start gap-3 ${clazz(type)}`;
    box.setAttribute('role','status');
    box.innerHTML = `
      <div class="mt-0.5">${message}</div>
      <button type="button" aria-label="關閉" class="ml-2 shrink-0 opacity-90 hover:opacity-100">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>`;
    const container = ensureContainer();
    container.appendChild(box);

    let timer = null; let remaining = duration; let start = Date.now();
    function close(){ if (box.parentNode) box.parentNode.removeChild(box); }
    function startTimer(){ start = Date.now(); timer = setTimeout(close, remaining); }
    function pauseTimer(){ if (timer){ clearTimeout(timer); timer = null; remaining -= (Date.now() - start); } }
    startTimer();

    box.addEventListener('mouseenter', pauseTimer);
    box.addEventListener('mouseleave', ()=>{ if (!timer) startTimer(); });
    box.querySelector('button')?.addEventListener('click', ()=>{ pauseTimer(); close(); });

    return { close };
  }
  window.Toast = { show };
})();
