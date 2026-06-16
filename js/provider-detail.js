// Render provider detail page based on URL ?id=...
(function () {
  function qs(selector, root = document) { return root.querySelector(selector); }
  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const categoryThemeMap = window.categoryThemeMap || {
    agriculture: 'category-agriculture',
    '農業': 'category-agriculture',
    '農林漁牧業': 'category-agriculture',
    funeral: 'category-funeral',
    '殯葬業': 'category-funeral',
    communication: 'category-communication',
    '通訊業': 'category-communication',
    floral: 'category-floral',
    '花藝類': 'category-floral',
    music: 'category-music',
    '樂器零售業': 'category-music',
    food: 'category-food',
    '餐飲業': 'category-food',
    'car-beauty': 'category-car-beauty',
    '汽車美容業': 'category-car-beauty'
  };
  window.categoryThemeMap = categoryThemeMap;
  const categoryThemeClasses = Array.from(new Set(Object.values(categoryThemeMap)));

  function setCategoryTheme(category) {
    document.body.classList.add('category-page');
    document.body.classList.remove(...categoryThemeClasses);
    const themeClass = categoryThemeMap[(category || '').trim()] || '';
    if (themeClass) document.body.classList.add(themeClass);
  }

  function ensureLightbox() {
    return window.Lightbox ? window.Lightbox.ensureLightbox() : null;
  }

  function enableLightboxOn(container, sources) {
    if (window.Lightbox) {
      window.Lightbox.enableLightboxOn(container, sources);
    }
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

  function ensureContactFlip() {
    let overlay = document.getElementById('contact-flip-overlay');
    if (overlay) return overlay.__open;
    overlay = document.createElement('div');
    overlay.id = 'contact-flip-overlay';
    overlay.className = 'contact-flip-overlay';
    overlay.innerHTML = `
      <div class="contact-flip-backdrop"></div>
      <div class="contact-flip-stage">
        <div class="contact-flip-card">
          <button class="contact-flip-close" aria-label="關閉">×</button>
          <div class="contact-flip-header">
            <div class="contact-flip-kicker">聯絡資訊</div>
            <h2>聯絡我們</h2>
          </div>
          <div class="contact-flip-body">
            <div class="contact-flip-grid"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const backdrop = overlay.querySelector('.contact-flip-backdrop');
    const card = overlay.querySelector('.contact-flip-card');
    const title = overlay.querySelector('.contact-flip-header h2');
    const grid = overlay.querySelector('.contact-flip-grid');
    const closeBtn = overlay.querySelector('.contact-flip-close');
    let closeTimer = null;

    function renderContent() {
      const c = window.contactData || {};
      title.textContent = c.name || '聯絡我們';
      const items = [
        [`tel:${c.phoneRaw || ''}`, '📞 電話', c.phone || ''],
        [`mailto:${c.email || ''}`, '✉️ 電子郵件', c.email || ''],
        [c.line || '#', '💬 LINE', '加入官方帳號'],
        [c.gmap || '#', '📍 地址', c.address || ''],
        [c.facebook || '#', '📘 Facebook', '粉絲專頁'],
        [c.instagram || '#', '📸 Instagram', c.instagramHandle || '@soundcore_2025']
      ];
      grid.innerHTML = items.map(([href, label, value]) => `
        <a href="${href}" target="_blank" rel="noopener" class="contact-flip-item">
          <strong>${label}</strong>
          <span>${value}</span>
        </a>
      `).join('');
    }

function open() {
      clearTimeout(closeTimer);
      card.classList.remove('show', 'hide');
      renderContent();
      document.body.classList.add('contact-flip-active');
      document.getElementById('provider-root')?.classList.add('contact-content-dim');
      overlay.classList.add('open');
      backdrop.classList.add('show');
      card.classList.add('show');
    }

    function close() {
      card.classList.remove('show');
      backdrop.classList.remove('show');
      setTimeout(() => {
        overlay.classList.remove('open');
        document.body.classList.remove('contact-flip-active');
        document.getElementById('provider-root')?.classList.remove('contact-content-dim');
      }, 350);
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
    setCategoryTheme(provider.category);

    const imgs = (Array.isArray(provider.images) ? provider.images : []).slice(0, 4);
    const fallbackImages = [
      'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/DSC01739__8a8686e4b1.webp',
      'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/DSC09555___ba0754ae5a.webp',
      'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/1000012756_61e30f039f.webp',
      'https://cdn.jsdelivr.net/gh/jimmy-shian/SocialAssistance@main/img/1000012016_6e6b5da647.webp'
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
            <!-- 原代碼: <img decoding="async" src="${c.images[0]}" alt="${c.title || ''}" class="w-full h-64 md:h-80 object-cover" /> -->
            <figure class="image-frame image-frame--card image-frame--rounded">
              <img decoding="async" src="${c.images[0]}" alt="${c.title || ''}" loading="lazy" />
            </figure>
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
              <!-- 原代碼: <img decoding="async" src="${c.images[0]}" alt="${c.title || ''}" class="w-full h-56 object-cover" /> -->
              <figure class="image-frame image-frame--card image-frame--rounded">
                <img decoding="async" src="${c.images[0]}" alt="${c.title || ''}" loading="lazy" />
              </figure>
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

      <header class="category-section provider-simple-hero mb-10">
        <div>
          <div class="provider-simple-kicker">${provider.category || '探索體驗'}</div>
          <h1>${provider.name}</h1>
          <p>${provider.description || '透過現場觀察與簡單實作，認識產業日常與工作樣貌。'}</p>
        </div>
        <div class="provider-simple-gallery">
          ${heroImages.map((src, i) => `
            <button type="button" class="provider-simple-photo" data-photo-index="${i}">
              <!-- 原代碼: <img decoding="async" src="${src}" loading="lazy" alt="${provider.name} 照片 ${i + 1}"> -->
              <figure class="image-frame image-frame--card image-frame--rounded w-full h-full">
                <img decoding="async" src="${src}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} alt="${provider.name} 照片 ${i + 1}">
              </figure>
            </button>`).join('')}
        </div>
      </header>

      <section aria-labelledby="sec-info" class="category-section provider-simple-info mb-12">
        <article>
          <span>地點</span>
          <strong>${provider.address || provider.location || '-'}</strong>
        </article>
        <article>
          <span>聯絡方式</span>
          <button class="contact-flip-trigger font-bold text-lg" aria-label="查看聯絡詳情">
            <span>📞 查看聯絡詳情</span>
            <i class="fas fa-chevron-right text-xs ml-1"></i>
          </button>
        </article>
      </section>

      <section aria-labelledby="sec-timeline" class="category-section mb-12">
        <h2 id="sec-timeline" class="text-2xl font-bold mb-6 flex items-center gap-3">
          課程安排
          <span class="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">Steps</span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${(provider.timeline || []).map((item, idx) => {
            const stepImg = item.image || ((provider.images && provider.images.length) ? provider.images[idx % provider.images.length] : fallbackImages[idx % fallbackImages.length]);
            return `
              <div class="card-dynamic-bg rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-[var(--border)] flex flex-col">
                <div class="p-5 flex-1 flex flex-col">
                  <div class="text-xs font-mono font-bold text-[var(--primary)] mb-1">STEP ${String(idx + 1).padStart(2, '0')}</div>
                  <h3 class="font-bold text-lg mb-2 text-[var(--text-primary)]">${esc(item.title || '探索活動')}</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1">${esc(item.detail || '')}</p>
                </div>
                ${stepImg ? `
                  <div class="image-frame image-frame--card aspect-[4/3] overflow-hidden">
                    <img decoding="async" src="${stepImg}" alt="${esc(item.title || '探索步驟')}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <section aria-labelledby="sec-cases" class="category-section mb-12">
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
      if (trigger) {
        const openContact = ensureContactFlip();
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
      setCategoryTheme('');
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
