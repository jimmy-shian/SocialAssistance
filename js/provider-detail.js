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
function setupMarquee(rootEl) {
  const track = rootEl.querySelector('.carousel-track');
  const seq1 = track?.querySelector('.marquee-seq');
  if (!track || !seq1) return;

  // 等所有圖片載入完成（包含 lazy-loading）
  function waitImagesLoaded(el) {
    const imgs = Array.from(el.querySelectorAll('img'));
    return Promise.all(imgs.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise(res => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
          })
    ));
  }

  function measureAndApply() {
    const containerW = rootEl.getBoundingClientRect().width;

    // 複製 seq1 直到寬度至少大於容器（避免空白）
    const original = Array.from(seq1.querySelectorAll('img'));
    let guard = 0;
    while (seq1.getBoundingClientRect().width < containerW + 24 && guard < 200) {
      original.forEach(img => seq1.appendChild(img.cloneNode(true)));
      guard++;
    }

    // 後續 sequence 也複製，確保無縫
    const others = Array.from(track.querySelectorAll('.marquee-seq')).slice(1);
    others.forEach(s => { s.innerHTML = seq1.innerHTML; });

    // 設置 CSS 變數
    const distance = seq1.getBoundingClientRect().width;
    rootEl.style.setProperty('--marquee-distance', distance + 'px');

    const pxPerSec = 30; // 調整動畫速度
    const secs = Math.max(20, Math.min(80, distance / pxPerSec));
    rootEl.style.setProperty('--carousel-speed', secs + 's');
  }

  // 初次測量
  waitImagesLoaded(track).then(() => {
    measureAndApply();
    if (typeof installDragMarquee === 'function') {
      installDragMarquee(rootEl, track, seq1);
    }
  });

  // 自動響應 Resize
  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(measureAndApply, 180);
  });

  // hover 暫停動畫
  rootEl.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
  rootEl.addEventListener('mouseleave', () => track.style.animationPlayState = '');
}

  // Confetti removed for editorial design

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
        const pt = { x: e.clientX || (window.innerWidth / 2), y: e.clientY || (window.innerHeight / 2) };
        // Confetti removed
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

    function isYouTube(url) { return /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i.test(url || ''); }
    function ytId(url) { const m = (url || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i); return m ? m[1] : ''; }
    function isVimeo(url) { return /vimeo\.com\/(\d+)/i.test(url || ''); }
    function vimeoId(url) { const m = (url || '').match(/vimeo\.com\/(\d+)/i); return m ? m[1] : ''; }
    function isMp4(url) { return /\.mp4($|\?)/i.test(url || ''); }

    function ensureVideoModal() {
      let vm = document.getElementById('video-modal');
      if (vm && vm.__open) return vm.__open;
      vm = document.createElement('div');
      vm.id = 'video-modal';
      vm.className = 'lightbox';
      vm.innerHTML = `
        <div class="video-shell" style="max-width:min(92vw,1200px);width:100%;aspect-ratio:16/9;position:relative;">
          <div class="video-frame" style="position:absolute;inset:0;display:grid;place-items:center;"></div>
          <button class="close-btn" aria-label="關閉" style="position:absolute;top:8px;right:8px;z-index:2;width:36px;height:36px;border:none;border-radius:9999px;background:rgba(0,0,0,.55);color:#fff;font-size:22px;line-height:1;cursor:pointer;">×</button>
        </div>`;
      document.body.appendChild(vm);
      const frame = vm.querySelector('.video-frame');
      const btnClose = vm.querySelector('.close-btn');
      function close() { vm.classList.remove('open'); frame.innerHTML = ''; }
      btnClose.addEventListener('click', close);
      vm.addEventListener('click', (e) => { if (e.target === vm) close(); });
      document.addEventListener('keydown', (e) => { if (vm.classList.contains('open') && e.key === 'Escape') close(); });
      function open(url) {
        let html = '';
        if (isYouTube(url)) {
          const id = ytId(url);
          html = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        } else if (isVimeo(url)) {
          const id = vimeoId(url);
          html = `<iframe width="100%" height="100%" src="https://player.vimeo.com/video/${id}?autoplay=1" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
        } else if (isMp4(url)) {
          html = `<video src="${url}" controls autoplay playsinline style="width:100%;height:100%;object-fit:contain;background:#000"></video>`;
        }
        frame.innerHTML = html;
        vm.classList.add('open');
      }
      vm.__open = open;
      return open;
    }

    function renderCases(provider) {
      const cases = Array.isArray(provider.cases) ? provider.cases : [];
      if (!cases.length) return '';
      const withMedia = cases.filter(c => (c && ((Array.isArray(c.images) && c.images.length) || c.video)));
      const textOnly = cases.filter(c => !withMedia.includes(c));

      const parts = [];

      // 1) Single media case -> horizontal alternating layout
      if (withMedia.length === 1) {
        const c = withMedia[0];
        const hasImg = Array.isArray(c.images) && c.images.length;
        const mediaHtml = hasImg ? `
          <div class="rounded-xl overflow-hidden shadow-md case-media" data-images="${(c.images || []).join('|')}">
            <img src="${c.images[0]}" alt="${c.title || ''}" class="w-full h-64 md:h-80 object-cover" />
          </div>` : `
          <button class="case-video w-full aspect-video rounded-xl overflow-hidden shadow-md bg-black text-white grid place-items-center" data-video="${c.video}">
            <span class="inline-flex items-center gap-2 font-semibold"><span class="text-2xl">▶</span> 觀看影片</span>
          </button>`;
        const textHtml = `
          <div>
            <h3 class="text-xl font-bold mb-2">${c.title || ''}</h3>
            ${c.summary ? `<p class="text-gray-700 dark:text-gray-300">${c.summary}</p>` : ''}
          </div>`;
        parts.push(`
          <div class="grid md:grid-cols-2 gap-6 items-center">
            <div>${mediaHtml}</div>
            <div>${textHtml}</div>
          </div>`);
      }

      // 2) Multi media cases -> vertical cards grid
      if (withMedia.length >= 2) {
        const cards = withMedia.map((c) => {
          const mediaBlock = (Array.isArray(c.images) && c.images.length) ? `
            <div class="rounded-lg overflow-hidden case-media" data-images="${(c.images || []).join('|')}">
              <img src="${c.images[0]}" alt="${c.title || ''}" class="w-full h-56 object-cover" />
            </div>` : (c.video ? `
            <button class="case-video w-full aspect-video rounded-lg overflow-hidden bg-black text-white grid place-items-center" data-video="${c.video}">
              <span class="inline-flex items-center gap-2 font-semibold"><span class="text-xl">▶</span> 播放影片</span>
            </button>` : '');
          return `
            <article class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow hover:shadow-md transition">
              ${mediaBlock}
              <h3 class="mt-3 font-semibold">${c.title || ''}</h3>
              ${c.summary ? `<p class="text-gray-600 dark:text-gray-300 text-sm">${c.summary}</p>` : ''}
            </article>`;
        }).join('');
        parts.push(`<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>`);
      }

      // 3) Text-only list (no media)
      if (textOnly.length) {
        const items = textOnly.map(c => `
          <li class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <div class="font-semibold">${c.title || ''}</div>
            ${c.summary ? `<div class="text-gray-600 dark:text-gray-300">${c.summary}</div>` : ''}
          </li>`).join('');
        parts.push(`<ul class="mt-6 space-y-3">${items}</ul>`);
      }

      return parts.join('\n');
    }

    root.innerHTML = `
      <nav class="text-sm mb-6" aria-label="麵包屑">
        <a class="link-soft text-[var(--primary)]" href="./explore.html">探索資源平台</a>
        <span class="mx-2 text-gray-400">/</span>
        <span class="text-gray-500 dark:text-gray-300">${provider.name}</span>
      </nav>

      <header class="mb-8">
        <h1 class="text-3xl md:text-4xl font-bold">${provider.name}</h1>
        <div class="mt-2 inline-block bg-[var(--surface-2)] text-[var(--primary)] text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700">${provider.category}</div>
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
          const items = (provider[b.key] || []).map(v => `<li class=\"interactive-li flex items-start gap-2\"><span class=\"icon text-purple-500\">•</span><span>${v}</span></li>`).join('');
          return `
            <div class="p-5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
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
        return `<a class=\"font-semibold mt-1 link-soft text-[var(--primary)] break-all\" href=\"${url}\" target=\"_blank\" rel=\"noopener\">${display || '查看地圖'}</a>`;
      })()}
        </div>
      </section>

      <section aria-labelledby="sec-photos" class="mb-12">
        <div class="flex items-center justify-between mb-4">
          <h2 id="sec-photos" class="text-2xl font-bold">活動照片</h2>
          <a href="#sec-cases" class="link-soft text-[var(--primary)]">精選案例</a>
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
        ${renderCases(provider)}
      </section>
    `;

    // Lightbox binding for photos & marquee sizing
    const carousel = document.getElementById('photos-carousel');
    if (carousel) { enableLightboxOn(carousel, imgs); setupMarquee(carousel); }
    // Cases: bind lightbox on media and video modal
    try {
      const casesRoot = document.getElementById('sec-cases')?.parentElement;
      if (casesRoot) {
        // bind images
        casesRoot.querySelectorAll('.case-media').forEach(box => {
          const sources = ((box.getAttribute('data-images') || '').split('|').filter(Boolean));
          if (sources.length) enableLightboxOn(box, sources);
        });
        // bind video
        const openVideo = ensureVideoModal();
        casesRoot.addEventListener('click', (e) => {
          const btn = e.target.closest('.case-video');
          if (!btn) return;
          const url = btn.getAttribute('data-video');
          if (url) { e.preventDefault(); openVideo(url); }
        });

        // apply video posters (YouTube/Vimeo)
        function posterFrom(url) {
          if (!url) return '';
          if (isYouTube(url)) return `https://i.ytimg.com/vi/${ytId(url)}/hqdefault.jpg`;
          if (isVimeo(url)) return `https://vumbnail.com/${vimeoId(url)}.jpg`;
          return '';
        }
        casesRoot.querySelectorAll('.case-video').forEach(btn => {
          const url = btn.getAttribute('data-video') || '';
          const poster = posterFrom(url);
          if (poster) {
            btn.style.backgroundImage = `url('${poster}')`;
            btn.style.backgroundSize = 'cover';
            btn.style.backgroundPosition = 'center';
            btn.style.color = '#fff';
            // add overlay blur/shine for better contrast
            if (!btn.querySelector('.overlay')) {
              const ov = document.createElement('div');
              ov.className = 'overlay';
              ov.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,.25);pointer-events:none;';
              btn.style.position = 'relative';
              btn.prepend(ov);
            }
          }
        });
      }
    } catch (e) { }
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

  // Re-render when providers updated
  try {
    const EVT = (window.DataAPI && window.DataAPI.EVENT) || 'data:updated';
    document.addEventListener(EVT, (ev) => {
      const ds = (window.AppConfig && window.AppConfig.datasets && window.AppConfig.datasets.providers) || 'providers';
      const keys = (ev && ev.detail && ev.detail.keys) || [];
      if (!keys.length || keys.includes(ds)) {
        const id = getParam('id');
        const dataset = window.providersData || {};
        const p = dataset[id];
        if (p) render(p);
      }
    });
  } catch (e) { }
})();
