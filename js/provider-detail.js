// Render provider detail page based on URL ?id=...
(function () {
  function qs(selector, root = document) { return root.querySelector(selector); }
  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function ensureLightbox() {
    let lb = document.getElementById('global-lightbox');
    if (lb && lb.__controller) return lb.__controller;
    lb = document.createElement('div');
    lb.id = 'global-lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `
      <img alt="擴大顯示" />
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
      nodes.forEach((t, idx)=>{
        if (idx === state.index) t.classList.add('active'); else t.classList.remove('active');
      });
      const active = thumbs?.querySelector('img.thumb.active');
      if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    function renderThumbs(){
      if (!thumbs) return;
      thumbs.innerHTML = '';
      const frag = document.createDocumentFragment();
      state.sources.forEach((src, idx) => {
        const t = document.createElement('img');
        t.className = 'thumb';
        t.src = src; t.alt = `縮圖 ${idx+1}`; t.dataset.index = String(idx);
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

  function setupMarquee(rootEl) {
    const track = rootEl.querySelector('.carousel-track');
    const seq1 = track?.querySelector('.marquee-seq');
    if (!track || !seq1) return;

    function waitImagesLoaded(el) {
      const imgs = Array.from(el.querySelectorAll('img'));
      return Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); })));
    }

    function measureAndApply() {
      const containerW = rootEl.getBoundingClientRect().width;
      // Ensure seq1 is at least as wide as container (avoid visible blank)
      const original = Array.from(seq1.querySelectorAll('img'));
      let guard = 0;
      while (seq1.getBoundingClientRect().width < containerW + 24 && guard < 200) {
        // duplicate items cyclically
        original.forEach(img => seq1.appendChild(img.cloneNode(true)));
        guard++;
      }
      // Make the following sequence(s) identical to seq1 to guarantee seamless loop
      const others = Array.from(track.querySelectorAll('.marquee-seq')).slice(1);
      others.forEach(s => { s.innerHTML = seq1.innerHTML; });

      const distance = seq1.getBoundingClientRect().width;
      rootEl.style.setProperty('--marquee-distance', distance + 'px');
      // Speed proportional to distance for similar perceived speed
      const pxPerSec = 30; // tune feel
      const secs = Math.max(20, Math.min(80, distance / pxPerSec));
      rootEl.style.setProperty('--carousel-speed', secs + 's');
    }

    waitImagesLoaded(track).then(() => {
      measureAndApply();
      if (typeof installDragMarquee === 'function') {
        installDragMarquee(rootEl, track, seq1);
      }
    });
    let timer;
    window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(measureAndApply, 180); });
  }

  function ensureConfettiCSS() {
    if (document.getElementById('confetti-style')) return;
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confetti-fall { from { transform: translate(0,0) rotate(0deg); opacity:1 } to { transform: translate(var(--dx), var(--dy)) rotate(720deg); opacity:0 } }
      .confetti-piece { position: fixed; width: 8px; height: 12px; will-change: transform, opacity; border-radius: 2px; pointer-events: none; z-index: 1100; animation: confetti-fall 900ms ease-out forwards; }
    `;
    document.head.appendChild(style);
  }

  function confettiBurst(x = window.innerWidth/2, y = window.innerHeight/2, count = 60) {
    ensureConfettiCSS();
    const colors = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa'];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const dx = (Math.random() * 2 - 1) * 200 + 'px';
      const dy = (Math.random() * 1.5 + 0.8) * 280 + 'px';
      const left = x + (Math.random() * 40 - 20);
      const top = y + (Math.random() * 20 - 10);
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      el.style.setProperty('--dx', dx);
      el.style.setProperty('--dy', dy);
      el.style.background = colors[i % colors.length];
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }
  }

  function attachInteractiveChecklist(root) {
    const items = Array.from(root.querySelectorAll('.interactive-li'));
    if (!items.length) return;
    let done = 0;
    items.forEach(li => {
      li.addEventListener('click', (e) => {
        const wasDone = li.classList.toggle('task-done');
        const icon = li.querySelector('.icon');
        if (icon) icon.textContent = wasDone ? '✓' : '•';
        done += wasDone ? 1 : -1;
        const pt = { x: e.clientX || (window.innerWidth/2), y: e.clientY || (window.innerHeight/2) };
        confettiBurst(pt.x, pt.y, wasDone ? 40 : 15);
        if (done === items.length) {
          setTimeout(() => confettiBurst(window.innerWidth/2, 120, 120), 200);
        }
      });
    });
  }

  function render(provider) {
    const root = qs('#provider-root');
    if (!root) return;

    const imgs = Array.isArray(provider.images) ? provider.images : [];
    const seqHtml = imgs.map((src, i) => `
      <img src="${src}" loading="lazy" alt="${provider.name} 活動照片 ${i + 1}" />
    `).join('');

    const timelineHtml = (provider.timeline || []).map(item => `
      <div class="flex gap-4 items-start">
        <div class="text-sm font-mono text-gray-500 dark:text-gray-200 w-16">${item.time}</div>
        <div>
          <div class="font-semibold">${item.title}</div>
          <div class="text-gray-600 dark:text-gray-300">${item.detail}</div>
        </div>
      </div>
    `).join('<div class="h-4"></div>');

    const casesHtml = (provider.cases || []).map(c => `
      <li class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700">
        <div class="font-semibold">${c.title}</div>
        <div class="text-gray-600 dark:text-gray-300">${c.summary}</div>
      </li>
    `).join('');

    root.innerHTML = `
      <nav class="text-sm mb-6" aria-label="麵包屑">
        <a class="text-blue-500 hover:underline" href="./explore.html">探索資源平台</a>
        <span class="mx-2 text-gray-400">/</span>
        <span class="text-gray-500 dark:text-gray-300">${provider.name}</span>
      </nav>

      <header class="mb-8">
        <h1 class="text-3xl md:text-4xl font-bold">${provider.name}</h1>
        <div class="mt-2 inline-block bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-sm px-2 py-1 rounded">${provider.category}</div>
        <p class="mt-4 text-gray-700 dark:text-gray-300">${provider.description}</p>
      </header>

      ${(() => {
        const blocks = [
          { key: 'know', title: '你將認識', color: 'from-blue-500/10', icon: '📘' },
          { key: 'learn', title: '你將學到', color: 'from-green-500/10', icon: '🛠️' },
          { key: 'gain', title: '你將獲得', color: 'from-purple-500/10', icon: '🏆' }
        ];
        const hasAny = blocks.some(b => Array.isArray(provider[b.key]) && provider[b.key].length);
        if (!hasAny) return '';
        const cols = blocks.map(b => {
          const items = (provider[b.key] || []).map(v => `<li class="interactive-li flex items-start gap-2"><span class="icon text-blue-500">•</span><span>${v}</span></li>`).join('');
          return `
            <div class="p-5 rounded-lg bg-gradient-to-br ${b.color} to-transparent shadow">
              <div class="flex items-center gap-2 mb-2"><span>${b.icon}</span><h3 class="font-semibold">${b.title}</h3></div>
              <ul class="space-y-1 text-gray-700 dark:text-gray-200 text-sm">${items}</ul>
            </div>
          `;
        }).join('');
        return `<section class="grid md:grid-cols-3 gap-4 mb-10">${cols}</section>`;
      })()}

      <section aria-labelledby="sec-info" class="grid md:grid-cols-3 gap-6 mb-12">
        <div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 shadow">
          <div class="text-gray-500 text-sm">課程時間</div>
          <div class="font-semibold mt-1">${provider.schedule || '-'}</div>
        </div>
        <div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 shadow md:col-span-2">
          <div class="text-gray-500 text-sm">地點（點我開啟 Google 地圖）</div>
          ${(() => {
            const lat = provider.coords?.lat;
            const lng = provider.coords?.lng;
            const url = provider.gmapUrl || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null);
            const name = [provider.location || '', provider.address || ''].filter(Boolean).join(' ');
            const coord = (lat && lng) ? `${lat.toFixed(3)}, ${lng.toFixed(3)}` : '';
            const display = [name, coord ? `（${coord}）` : ''].join('');
            if (!url) return `<div class=\"font-semibold mt-1\">${display || '-'}</div>`;
            return `<a class=\"font-semibold mt-1 text-blue-600 dark:text-blue-400 hover:underline break-all\" href=\"${url}\" target=\"_blank\" rel=\"noopener\">${display || '查看地圖'}</a>`;
          })()}
        </div>
      </section>

      <section aria-labelledby="sec-photos" class="mb-12">
        <div class="flex items-center justify-between mb-4">
          <h2 id="sec-photos" class="text-2xl font-bold">活動照片</h2>
          <a href="#sec-cases" class="text-blue-500 hover:underline">精選案例</a>
        </div>
        <div class="carousel-marquee" id="photos-carousel">
          <div class="carousel-track">
            <div class="marquee-seq">${seqHtml}</div>
            <div class="marquee-seq">${seqHtml}</div>
          </div>
        </div>
      </section>

      <section aria-labelledby="sec-map" class="mb-12">
        <h2 id="sec-map" class="text-2xl font-bold mb-4">地圖標示地點</h2>
        <div class="flex items-center gap-3 mb-3">
          <div class="inline-flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden" role="group" aria-label="地圖鎖定方式">
            <button id="lock-county" class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" aria-pressed="false">縣市</button>
            <button id="lock-site" class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" aria-pressed="false">場域</button>
            <button id="lock-none" class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" aria-pressed="false">自由</button>
          </div>
          <span id="lock-label" class="text-sm text-gray-600 dark:text-gray-300">鎖定：初始化中…</span>
        </div>
        <div id="provider-map" class="w-full h-72 rounded-lg shadow"></div>
      </section>

      <section aria-labelledby="sec-timeline" class="mb-12">
        <h2 id="sec-timeline" class="text-2xl font-bold mb-4">課程安排（時間軸）</h2>
        <div class="relative pl-6">
          <div class="absolute left-2 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"></div>
          <div class="space-y-4">
            ${timelineHtml}
          </div>
        </div>
      </section>

      <section aria-labelledby="sec-cases" class="mb-12">
        <h2 id="sec-cases" class="text-2xl font-bold mb-4">精選案例</h2>
        <ul class="space-y-3">
          ${casesHtml}
        </ul>
      </section>
    `;

    // Lightbox binding for photos & marquee sizing
    const carousel = document.getElementById('photos-carousel');
    if (carousel) { enableLightboxOn(carousel, imgs); setupMarquee(carousel); }
    attachInteractiveChecklist(root);
  }

  function start() {
    const id = getParam('id');
    const dataset = window.providersData || {};
    const provider = dataset[id];
    const root = qs('#provider-root');
    if (!root) return;
    if (!id || !provider) {
      root.innerHTML = `<div class="text-center text-red-500">找不到此業者，請回到「探索資源平台」。</div>`;
      return;
    }
    render(provider);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
