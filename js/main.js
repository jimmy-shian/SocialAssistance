// Main JavaScript file
console.log('main.js loaded');

// Theme switcher logic

// Apply initial theme and update icons (with guards)
function applyInitialTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = localStorage.getItem('color-theme');
    const isDark = stored === 'dark' || (!stored && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
    // re-select icons at use-time to handle dynamic nav injection
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
applyInitialTheme();

function bindThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;
    // set aria state initially
    themeToggleBtn.setAttribute('aria-pressed', String(document.documentElement.classList.contains('dark')));
    themeToggleBtn.addEventListener('click', function() {
        // if set via local storage previously
        if (localStorage.getItem('color-theme')) {
            if (localStorage.getItem('color-theme') === 'light') {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            }
        // if NOT set via local storage previously
        } else {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            }
        }
        // update icons by re-selecting
        const darkIcon = document.getElementById('theme-toggle-dark-icon');
        const lightIcon = document.getElementById('theme-toggle-light-icon');
        if (darkIcon && lightIcon) {
            darkIcon.classList.toggle('hidden');
            lightIcon.classList.toggle('hidden');
        }
        const darkIconM = document.getElementById('theme-toggle-dark-icon-mobile');
        const lightIconM = document.getElementById('theme-toggle-light-icon-mobile');
        if (darkIconM && lightIconM) {
            darkIconM.classList.toggle('hidden');
            lightIconM.classList.toggle('hidden');
        }
        // update aria state
        themeToggleBtn.setAttribute('aria-pressed', String(document.documentElement.classList.contains('dark')));
    });
}
bindThemeToggle();
// Re-apply after nav/footer are injected dynamically
document.addEventListener('nav-footer-rendered', () => {
    applyInitialTheme();
    bindThemeToggle();
});

// Font size switcher logic (rotary knob)
const root = document.documentElement;

const applyFontSize = (size) => {
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    switch (size) {
        case 'sm':
            root.classList.add('text-sm');
            break;
        case 'lg':
            root.classList.add('text-lg');
            break;
        default:
            root.classList.add('text-base');
            break;
    }
    localStorage.setItem('font-size', size);
};

const SIZE_VALUES = ['sm', 'base', 'lg'];
function sizeToIndex(size) { return Math.max(0, SIZE_VALUES.indexOf(size || 'base')); }
function indexToSize(i) { return SIZE_VALUES[((i % 3) + 3) % 3]; }

function updateKnobUI(knob, index) {
    if (!knob) return;
    knob.classList.remove('knob-angle-0', 'knob-angle-1', 'knob-angle-2');
    knob.classList.add(`knob-angle-${index}`);
    knob.setAttribute('aria-valuenow', String(index));
    const label = index === 0 ? '小' : index === 2 ? '大' : '中';
    knob.setAttribute('title', `字體：${label}`);
}

function bindFontSizeKnob() {
    const knob = document.getElementById('font-size-knob');
    if (!knob) return;
    // init from storage
    const stored = localStorage.getItem('font-size') || 'base';
    let idx = sizeToIndex(stored);
    updateKnobUI(knob, idx);

    function applyIndex(i) {
        idx = ((i % 3) + 3) % 3;
        updateKnobUI(knob, idx);
        applyFontSize(indexToSize(idx));
    }

    knob.addEventListener('click', () => {
        applyIndex(idx + 1);
    });
    knob.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); applyIndex(idx + 1); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); applyIndex(idx - 1); }
        if (e.key === 'Home') { e.preventDefault(); applyIndex(0); }
        if (e.key === 'End') { e.preventDefault(); applyIndex(2); }
    });

    // Drag-to-rotate with snapping
    let dragging = false;
    let pointerId = null;
    let center = { x: 0, y: 0 };
    const SNAP_ANGLES = [-60, 0, 60];

    function getCenter() {
        const r = knob.getBoundingClientRect();
        center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    function angleFromEvent(ev) {
        const x = ev.clientX - center.x;
        const y = center.y - ev.clientY; // invert Y so up is positive
        let deg = Math.atan2(y, x) * 180 / Math.PI - 90; // 0 at top
        if (deg < -120) deg = -120; if (deg > 120) deg = 120;
        // constrain to visible range
        if (deg < -75) deg = -75; if (deg > 75) deg = 75;
        return deg;
    }
    function nearestSnap(deg) {
        let best = 0, d = Infinity;
        for (let i = 0; i < SNAP_ANGLES.length; i++) {
            const delta = Math.abs(SNAP_ANGLES[i] - deg);
            if (delta < d) { d = delta; best = i; }
        }
        return best; // 0->sm, 1->base, 2->lg
    }

    function onPointerMove(ev) {
        if (!dragging) return;
        const deg = angleFromEvent(ev);
        knob.style.setProperty('--knob-angle', deg + 'deg');
    }
    function onPointerUp(ev) {
        if (!dragging) return;
        dragging = false;
        try { if (pointerId !== null) knob.releasePointerCapture(pointerId); } catch {}
        const styles = getComputedStyle(knob);
        const current = parseFloat(styles.getPropertyValue('--knob-angle')) || 0;
        const snapIndex = nearestSnap(current);
        applyIndex(snapIndex);
        knob.style.removeProperty('--knob-angle'); // let class control final angle
        pointerId = null;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
    }
    function onPointerDown(ev) {
        ev.preventDefault();
        getCenter();
        dragging = true;
        pointerId = ev.pointerId;
        try { knob.setPointerCapture(pointerId); } catch {}
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerup', onPointerUp, { passive: true });
        window.addEventListener('pointercancel', onPointerUp, { passive: true });
        onPointerMove(ev);
    }
    knob.addEventListener('pointerdown', onPointerDown);
}
bindFontSizeKnob();
document.addEventListener('nav-footer-rendered', bindFontSizeKnob);

// On page load, apply saved font size
const savedSize = localStorage.getItem('font-size') || 'base';
applyFontSize(savedSize);

// Simple circular font-size button binding
function updateFontSizeButtonLabel(size) {
    const labels = document.querySelectorAll('.font-size-label');
    labels.forEach(lbl => {
        lbl.textContent = size === 'sm' ? '小' : size === 'lg' ? '大' : '中';
    });
}
function bindFontSizeButton() {
    const btn = document.getElementById('font-size-btn');
    if (!btn) return;
    // init label from storage
    const current = localStorage.getItem('font-size') || 'base';
    updateFontSizeButtonLabel(current);

    btn.addEventListener('click', () => {
        // bounce animation
        btn.classList.remove('btn-bounce');
        void btn.offsetWidth; // reflow to restart animation
        btn.classList.add('btn-bounce');

        // advance size in order: sm -> base -> lg -> sm (with wave from small to the target)
        const current = localStorage.getItem('font-size') || 'base';
        const next = current === 'sm' ? 'base' : current === 'base' ? 'lg' : 'sm';

        // wave always from smallest
        const sequence = next === 'sm' ? ['sm']
                        : next === 'base' ? ['sm','base']
                        : ['sm','base','lg'];
        let i = 0;
        const step = () => {
            applyFontSize(sequence[i]);
            updateFontSizeButtonLabel(sequence[i]);
            i++;
            if (i < sequence.length) setTimeout(step, 90);
        };
        step();
    });
}
bindFontSizeButton();
document.addEventListener('nav-footer-rendered', bindFontSizeButton);

// ==============================
// Flowing background (blobs)
// ==============================
(function () {
  const MIN_SPEED = 0.35;
  const MAX_SPEED = 1.2;
  const COUNT = 6; // reasonable for performance

  function prefersReduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  class BlobMover {
    constructor(el) {
      this.el = el;
      const rect = this.el.getBoundingClientRect();
      this.size = rect.width || Math.max(240, Math.min(window.innerWidth * 0.28, 560));
      // random start
      this.initialX = Math.random() * Math.max(1, window.innerWidth - this.size);
      this.initialY = Math.random() * Math.max(1, window.innerHeight - this.size);
      this.x = this.initialX;
      this.y = this.initialY;
      this.vx = (MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)) * (Math.random() > 0.5 ? 1 : -1);
      this.vy = (MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)) * (Math.random() > 0.5 ? 1 : -1);
      this.el.style.top = this.initialY + 'px';
      this.el.style.left = this.initialX + 'px';
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      const maxX = window.innerWidth - this.size;
      const maxY = window.innerHeight - this.size;
      if (this.x >= maxX) { this.x = maxX; this.vx *= -1; }
      if (this.y >= maxY) { this.y = maxY; this.vy *= -1; }
      if (this.x <= 0) { this.x = 0; this.vx *= -1; }
      if (this.y <= 0) { this.y = 0; this.vy *= -1; }
      this.el.style.transform = `translate(${this.x - this.initialX}px, ${this.y - this.initialY}px)`;
    }
  }

  function initBlobs() {
    if (prefersReduced()) return; // respect user preference
    if (document.querySelector('.blobs')) return; // already added

    const container = document.createElement('div');
    container.className = 'blobs';
    for (let i = 0; i < COUNT; i++) {
      const b = document.createElement('div');
      b.className = 'blob';
      container.appendChild(b);
    }
    document.body.appendChild(container);

    const elems = Array.from(container.querySelectorAll('.blob'));
    const movers = elems.map(el => new BlobMover(el));

    function tick() {
      if (prefersReduced()) return; // stop if changed
      movers.forEach(m => m.update());
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    window.addEventListener('resize', () => {
      // reset initial positions to avoid drift when viewport changes a lot
      movers.forEach(m => {
        m.initialX = Math.max(0, Math.min(m.initialX, window.innerWidth - m.size));
        m.initialY = Math.max(0, Math.min(m.initialY, window.innerHeight - m.size));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlobs);
  } else {
    initBlobs();
  }
})();

// ==============================
// Global left-click ripple effect
// ==============================
(function(){
  function prefersReduced() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  const lightColors = ['rgba(59,130,246,.35)','rgba(16,185,129,.35)','rgba(245,158,11,.35)','rgba(236,72,153,.35)','rgba(99,102,241,.35)'];
  const darkColors  = ['rgba(147,197,253,.5)','rgba(134,239,172,.5)','rgba(253,186,116,.5)','rgba(244,114,182,.5)','rgba(165,180,252,.5)'];

  function colorPick(){
    const dark = document.documentElement.classList.contains('dark');
    const arr = dark ? darkColors : lightColors;
    return arr[Math.floor(Math.random()*arr.length)];
  }

  function spawnRipple(x,y){
    if(prefersReduced()) return;
    const d = document.createElement('div');
    d.className = 'ripple';
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    d.style.setProperty('--ripple-color', colorPick());
    document.body.appendChild(d);
    const remove = () => d.remove();
    d.addEventListener('animationend', remove, {once:true});
    setTimeout(remove, 800);
  }

  function onPointerDown(e){
    if(e.button !== 0) return; // left click only
    spawnRipple(e.clientX, e.clientY);
  }

  window.addEventListener('pointerdown', onPointerDown, {passive:true});
})();
