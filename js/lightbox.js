// Global Lightbox Component for image preview with slides and thumbnails.
(function () {
  function ensureLightbox() {
    let lb = document.getElementById('global-lightbox');
    if (lb && lb.__controller) return lb.__controller;
    lb = document.createElement('div');
    lb.id = 'global-lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `
      <img decoding="async" alt="擴大顯示" />
      <div class="nav" aria-hidden="true">
        <button class="nav-btn prev" aria-label="上一張">‹</button>
        <button class="nav-btn next" aria-label="下一張">›</button>
      </div>
      <div class="thumbs" role="listbox" aria-label="縮圖快速切換"></div>
      <button class="close-btn" aria-label="關閉">×</button>
    `;
    document.body.appendChild(lb);
    const img = lb.querySelector('img');
    const btnPrev = lb.querySelector('.prev');
    const btnNext = lb.querySelector('.next');
    const btnClose = lb.querySelector('.close-btn');
    const thumbs = lb.querySelector('.thumbs');
    const state = { index: 0, sources: [] };

    function show(i) {
      if (!state.sources.length) return;
      state.index = ((i % state.sources.length) + state.sources.length) % state.sources.length;
      img.src = state.sources[state.index];
      img.alt = `圖片 ${state.index + 1}`;
      // update active thumb
      const nodes = thumbs ? thumbs.querySelectorAll('img.thumb') : [];
      nodes.forEach((t, idx) => {
        if (idx === state.index) t.classList.add('active'); else t.classList.remove('active');
      });
      const active = thumbs?.querySelector('img.thumb.active');
      if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    function renderThumbs() {
      if (!thumbs) return;
      thumbs.innerHTML = '';
      const frag = document.createDocumentFragment();
      state.sources.forEach((src, idx) => {
        const t = document.createElement('img');
        t.className = 'thumb';
        t.src = src; t.alt = `縮圖 ${idx + 1}`; t.dataset.index = String(idx);
        frag.appendChild(t);
      });
      thumbs.appendChild(frag);
    }

    function open(i, sources) {
      // unique sources to avoid duplicates
      if (Array.isArray(sources)) {
        state.sources = Array.from(new Set(sources));
      }
      renderThumbs();
      show(i || 0);
      lb.classList.add('open');
    }

    function close() { lb.classList.remove('open'); }
    function next() { show(state.index + 1); }
    function prev() { show(state.index - 1); }

    lb.addEventListener('click', (e) => {
      const inImage = img.contains(e.target);
      const inNav = !!e.target.closest('.nav');
      const inThumbs = !!e.target.closest('.thumbs');
      const inClose = !!e.target.closest('.close-btn');
      if (!inImage && !inNav && !inThumbs && !inClose) close();
    });
    btnClose.addEventListener('click', close);
    btnNext.addEventListener('click', next);
    btnPrev.addEventListener('click', prev);
    thumbs?.addEventListener('click', (e) => {
      const t = e.target.closest('img.thumb');
      if (!t) return;
      const idx = parseInt(t.dataset.index || '0', 10) || 0;
      show(idx);
    });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });

    const controller = { open, close, next, prev, show };
    lb.__controller = controller;
    return controller;
  }

  function enableLightboxOn(container, sources) {
    const ctrl = ensureLightbox();
    // Event delegation so cloned images work too
    container.addEventListener('click', (e) => {
      const target = e.target.closest('img');
      if (!target) return;
      // If just finished a drag, suppress click-to-open
      if (container.dataset.dragging === '1') return;
      e.preventDefault();
      const src = target.getAttribute('src') || '';
      const idx = Math.max(0, (sources || []).indexOf(src));
      ctrl.open(idx, sources);
    });
  }

  window.Lightbox = {
    ensureLightbox,
    enableLightboxOn
  };
})();
