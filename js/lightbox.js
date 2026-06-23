// Global Lightbox Component for image preview with slides and thumbnails.
(function () {
  function ensureLightbox() {
    let lb = document.getElementById('global-lightbox');
    if (lb && lb.__controller) return lb.__controller;
    lb = document.createElement('div');
    lb.id = 'global-lightbox';
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '圖片檢視器');
    lb.innerHTML = `
      <img decoding="async" alt="擴大顯示" />
      <div class="lightbox-nav" aria-hidden="true">
        <button class="lightbox-nav-btn lightbox-prev" type="button" aria-label="上一張">&#8249;</button>
        <button class="lightbox-nav-btn lightbox-next" type="button" aria-label="下一張">&#8250;</button>
      </div>
      <div class="lightbox-thumbs" role="listbox" aria-label="縮圖快速切換"></div>
      <button class="lightbox-close-btn" type="button" aria-label="關閉">&#x2715;</button>
    `;
    document.body.appendChild(lb);
    const img = lb.querySelector('img');
    const btnPrev = lb.querySelector('.lightbox-prev');
    const btnNext = lb.querySelector('.lightbox-next');
    const btnClose = lb.querySelector('.lightbox-close-btn');
    const thumbs = lb.querySelector('.lightbox-thumbs');
    const state = { index: 0, sources: [] };

    function show(i) {
      if (!state.sources.length) return;
      state.index = ((i % state.sources.length) + state.sources.length) % state.sources.length;
      img.src = state.sources[state.index];
      img.alt = `圖片 ${state.index + 1}`;
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
      if (Array.isArray(sources)) {
        state.sources = Array.from(new Set(sources));
      }
      renderThumbs();
      show(i || 0);
      lb.classList.add('open');
      document.body.classList.add('modal-open');
    }

    function close() {
      lb.classList.remove('open');
      document.body.classList.remove('modal-open');
    }
    function next() { show(state.index + 1); }
    function prev() { show(state.index - 1); }

    lb.addEventListener('click', (e) => {
      const inImage = img.contains(e.target);
      const inNav = !!e.target.closest('.lightbox-nav');
      const inThumbs = !!e.target.closest('.lightbox-thumbs');
      const inClose = !!e.target.closest('.lightbox-close-btn');
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
    container.addEventListener('click', (e) => {
      const target = e.target.closest('img');
      if (!target) return;
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
