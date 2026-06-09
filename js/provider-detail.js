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

  function ensureContactFlip(provider) {
    let overlay = document.getElementById('contact-flip-overlay');
    if (overlay) return overlay.__open;
    overlay = document.createElement('div');
    overlay.id = 'contact-flip-overlay';
    overlay.className = 'contact-flip-overlay';
    overlay.innerHTML = `
      <div class="contact-flip-backdrop"></div>
      <div class="contact-flip-stage">
        <div class="contact-flip-card">
          <div class="contact-flip-face contact-flip-front">
            <div class="contact-flip-loading">載入中⋯</div>
          </div>
          <div class="contact-flip-face contact-flip-back">
            <button class="contact-flip-close" aria-label="關閉">×</button>
            <div class="contact-flip-header">
              <div class="contact-flip-kicker">聯絡資訊</div>
              <h2>${provider.name}</h2>
            </div>
            <div class="contact-flip-body">
              ${provider.contact ? `
                <div class="contact-flip-grid">
                  ${provider.contact.phone ? `<div class="contact-flip-item">
                    <strong>📞 電話</strong>
                    <span>${provider.contact.phone}</span>
                  </div>` : ''}
                  ${provider.contact.email ? `<div class="contact-flip-item">
                    <strong>✉️ 電子郵件</strong>
                    <span>${provider.contact.email}</span>
                  </div>` : ''}
                  ${provider.contact.contactPerson ? `<div class="contact-flip-item">
                    <strong>👤 聯絡人</strong>
                    <span>${provider.contact.contactPerson}</span>
                  </div>` : ''}
                  ${provider.contact.line ? `<div class="contact-flip-item">
                    <strong>💬 LINE</strong>
                    <span>${provider.contact.line}</span>
                  </div>` : ''}
                  ${provider.contact.hours ? `<div class="contact-flip-item">
                    <strong>🕐 營業時間</strong>
                    <span>${provider.contact.hours}</span>
                  </div>` : ''}
                  ${provider.schedule ? `<div class="contact-flip-item">
                    <strong>📅 活動時段</strong>
                    <span>${provider.schedule}</span>
                  </div>` : ''}
                  ${provider.location || provider.address ? `<div class="contact-flip-item">
                    <strong>📍 地址</strong>
                    <span>${[provider.location || '', provider.address || ''].filter(Boolean).join(' ')}</span>
                  </div>` : ''}
                </div>
              ` : '<p class="text-gray-500">暫無聯絡資訊</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const backdrop = overlay.querySelector('.contact-flip-backdrop');
    const card = overlay.querySelector('.contact-flip-card');
    const closeBtn = overlay.querySelector('.contact-flip-close');

    function open() {
      document.getElementById('provider-root')?.classList.add('contact-content-dim');
      overlay.classList.add('open');
      requestAnimationFrame(() => {
        card.classList.add('flipped');
      });
    }

    function close() {
      card.classList.remove('flipped');
      overlay.classList.remove('open');
      document.getElementById('provider-root')?.classList.remove('contact-content-dim');
    }

    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (overlay.classList.contains('open') && e.key === 'Escape') close();
    });

    overlay.__open = open;
    overlay.__close = close;
    return open;
  }

  function render(provider) {
    const root = qs('#provider-root');
    if (!root) return;

    const imgs = (Array.isArray(provider.images) ? provider.images : []).slice(0, 4);
    const fallbackImages = [
      './img/DSC01739__8a8686e4b1.jpg',
      './img/DSC09555___ba0754ae5a.jpg',
      './img/1000012756_61e30f039f.jpg',
      './img/1000012016_6e6b5da647.jpg'
    ];
    const heroImages = (imgs.length ? imgs : fallbackImages).slice(0, 4);

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
            <article class="p-4 rounded-xl card-dynamic-bg hover:shadow-lg transition-all duration-300 group">
              <div class="overflow-hidden rounded-lg mb-4">
                 <div class="transform group-hover:scale-105 transition-transform duration-500">
                    ${mediaBlock}
                 </div>
              </div>
              <h3 class="mt-2 font-bold text-xl group-hover:text-[var(--primary)] transition-colors">${c.title || ''}</h3>
              ${c.summary ? `<p class="text-gray-600 dark:text-gray-300 text-sm mt-2 leading-relaxed">${c.summary}</p>` : ''}
            </article>`;
        }).join('');
        parts.push(`<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>`);
      }

      // 3) Text-only list (no media)
      if (textOnly.length) {
        const items = textOnly.map(c => `
          <li class="p-6 rounded-xl card-dynamic-bg hover:shadow-md transition-all duration-300">
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

      <header class="provider-simple-hero mb-10">
        <div>
          <div class="provider-simple-kicker">${provider.category || '探索體驗'}</div>
          <h1>${provider.name}</h1>
          <p>${provider.description || '透過現場觀察與簡單實作，認識產業日常與工作樣貌。'}</p>
        </div>
        <div class="provider-simple-gallery">
          ${heroImages.map((src, i) => `<button type="button" class="provider-simple-photo" data-photo-index="${i}"><img src="${src}" loading="lazy" alt="${provider.name} 照片 ${i + 1}"></button>`).join('')}
        </div>
      </header>

      <section aria-labelledby="sec-info" class="provider-simple-info mb-12">
        <article>
          <span>時間</span>
          <strong>${provider.schedule || '-'}</strong>
        </article>
        <article>
          <span>地點</span>
          ${(() => {
        const lat = provider.coords?.lat;
        const lng = provider.coords?.lng;
        const url = provider.gmapUrl || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null);
        const name = [provider.location || '', provider.address || ''].filter(Boolean).join(' ');
        const coord = (lat && lng) ? `${lat.toFixed(3)}, ${lng.toFixed(3)}` : '';
        const display = [name, coord ? `（${coord}）` : ''].join('');
        if (!url) return `<div class=\"font-bold text-lg\">${display || '-'}</div>`;
        return `<a class=\"font-bold text-lg hover:text-[var(--primary)] transition-colors flex items-center gap-2 group\" href=\"${url}\" target=\"_blank\" rel=\"noopener\">
                  ${display || '查看地圖'} 
                  <i class="fas fa-external-link-alt text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </a>`;
      })()}
        </article>
        <article>
          <span>聯絡方式</span>
          <button class="contact-flip-trigger font-bold text-lg" aria-label="查看聯絡詳情">
            <span>📞 查看聯絡詳情</span>
            <i class="fas fa-chevron-right text-xs ml-1"></i>
          </button>
        </article>
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
        <h2 id="sec-timeline" class="text-2xl font-bold mb-6 flex items-center gap-3">
          課程安排
          <span class="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">Timeline</span>
        </h2>
        <div class="relative pl-8 border-l-2 border-[var(--primary)]/20 space-y-8">
          ${(provider.timeline || []).map(item => `
            <div class="relative group">
              <span class="absolute -left-[39px] top-1 w-5 h-5 rounded-full border-4 border-white dark:border-gray-900 bg-[var(--primary)] shadow-sm group-hover:scale-125 transition-transform"></span>
              <div class="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                 <div class="font-mono font-bold text-[var(--primary)] text-lg min-w-[5rem]">${item.time}</div>
                 <div class="flex-1 card-dynamic-bg p-4 rounded-lg hover:shadow-md transition-shadow">
                    <h3 class="font-bold text-lg mb-1">${item.title}</h3>
                    <p class="text-gray-600 dark:text-gray-300">${item.detail}</p>
                 </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section aria-labelledby="sec-cases" class="mb-12">
        <h2 id="sec-cases" class="text-2xl font-bold mb-4">精選案例</h2>
        ${renderCases(provider)}
      </section>
    `;

    // Lightbox binding for photos & marquee sizing
    const gallery = root.querySelector('.provider-simple-gallery');
    if (gallery) enableLightboxOn(gallery, heroImages);
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
    // Contact flip trigger
    try {
      const trigger = root.querySelector('.contact-flip-trigger');
      if (trigger && provider.contact) {
        const openContact = ensureContactFlip(provider);
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          openContact();
        });
      }
    } catch (e) { }
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
