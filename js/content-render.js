// Injects textual content from siteContent.js to pages that declare placeholders
(function () {
  const content = window.siteContent || {};

  function renderIndex() {
    if (!content.index) return;
    const data = content.index;

    const h1 = document.getElementById('hero-title');
    const p = document.getElementById('hero-subtitle');
    const hero = document.getElementById('hero');
    if (h1) h1.textContent = data.heroTitle || h1.textContent;
    if (p) {
      const html = data.heroSubtitle || p.textContent;
      // 支援含超連結的 HTML
      p.innerHTML = html;
    }
    // 首頁 Hero 背景圖（固定背景）
    try {
      if (hero) {
        const url = data.heroImage || '';
        if (url) hero.style.backgroundImage = `url('${url}')`;
        // 盡量啟用 fixed，行動裝置不支援時瀏覽器會自動 fallback
        hero.style.backgroundAttachment = 'fixed';
      }
    } catch(e){}

    // 首頁重點故事
    try {
      const storySec = document.getElementById('story-section');
      if (storySec && data.story && (data.story.heading || data.story.body || (data.story.images||[]).length)) {
        const imgs = Array.isArray(data.story.images) ? data.story.images : [];
        const html = `
          <div class="grid md:grid-cols-2 gap-8 items-start">
            <div class="space-y-4">
              ${data.story.heading ? `<h2 class="text-3xl md:text-4xl font-extrabold">${data.story.heading}</h2>` : ''}
              ${data.story.body ? `<div class="prose prose-lg dark:prose-invert max-w-none leading-relaxed">${data.story.body}</div>` : ''}
            </div>
            <div class="grid grid-cols-2 gap-3">
              ${(imgs.slice(0,4)).map((u,i)=>`<div class="rounded-lg overflow-hidden shadow"><img src="${u}" alt="story${i+1}" class="w-full h-40 md:h-52 object-cover"></div>`).join('')}
            </div>
          </div>`;
        storySec.innerHTML = html;
      }
    } catch(e){}

    // 服務項目
    try {
      const svcWrap = document.getElementById('services-section');
      const svcTitle = document.getElementById('services-title');
      const svcList = document.getElementById('services-list');
      if (svcTitle) svcTitle.textContent = data.servicesTitle || '服務項目';
      if (svcList) {
        svcList.innerHTML = '';
        const arr = Array.isArray(data.services) ? data.services : [];
        arr.forEach(s => {
          const a = document.createElement(s.link ? 'a' : 'div');
          if (s.link) { a.href = s.link; a.target = '_self'; a.rel = 'noopener'; }
          a.className = 'relative h-72 rounded-2xl overflow-hidden shadow-lg group block focus:outline-none focus:ring-2 focus:ring-purple-500';
          a.innerHTML = `
            ${s.image ? `<img src="${s.image}" alt="${s.title||''}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">` : ''}
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            <div class="absolute bottom-4 left-4"><span class="px-3 py-1 rounded-full bg-white text-gray-900 text-sm font-semibold shadow">${s.title||''}</span></div>`;
          svcList.appendChild(a);
        });
      }
    } catch(e){}

    // 影片區塊
    try {
      const vSec = document.getElementById('video-section');
      const vTitle = document.getElementById('video-title');
      const vBox = document.getElementById('index-video');
      function isYouTube(u){ return /youtube\.com\/watch\?v=|youtu\.be\//.test(u||''); }
      function ytId(u){ const m=(u||'').match(/[?&]v=([^&]+)|youtu\.be\/([^?&]+)/); return (m && (m[1]||m[2])) || ''; }
      function isVimeo(u){ return /vimeo\.com\//.test(u||''); }
      function vimeoId(u){ const m=(u||'').match(/vimeo\.com\/(\d+)/); return (m && m[1]) || ''; }
      if (vTitle) vTitle.textContent = (data.video && data.video.title) || '';
      if (vBox) {
        const url = (data.video && data.video.url) || '';
        vBox.innerHTML = '';
        if (!url) {
          vBox.innerHTML = '<div class="w-full h-full grid place-items-center text-sm text-gray-500 dark:text-gray-400">尚未設定影片</div>';
        } else if (isYouTube(url)) {
          const id = ytId(url);
          vBox.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${id}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
        } else if (isVimeo(url)) {
          const id = vimeoId(url);
          vBox.innerHTML = `<iframe class="w-full h-full" src="https://player.vimeo.com/video/${id}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
        } else if (/\.mp4(\?|$)/i.test(url)) {
          vBox.innerHTML = `<video class="w-full h-full" controls src="${url}"></video>`;
        } else {
          vBox.innerHTML = `<a class="link-cta" href="${url}" target="_blank" rel="noopener">前往觀看 <span class="arrow">→</span></a>`;
        }
      }
    } catch(e){}

    const intro = document.getElementById('platform-intro');
    if (intro && Array.isArray(data.platformIntro)) {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      // ensure intro background var matches actual background color (light/dark or custom)
      try {
        function getBgColor(el){
          while (el) {
            const cs = getComputedStyle(el);
            const bg = cs.backgroundColor || 'rgba(0,0,0,0)';
            if (bg && !bg.includes('rgba(0, 0, 0, 0)') && bg !== 'transparent' && bg !== 'none') return bg;
            el = el.parentElement;
          }
          return getComputedStyle(document.body).backgroundColor || '#ffffff';
        }
        const bg = getBgColor(intro);
        intro.style.setProperty('--intro-bg', bg);
      } catch(e) {}

      intro.innerHTML = '';
      data.platformIntro.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'intro-row grid md:grid-cols-2 gap-8 items-center reveal-item';

        const imgWrap = document.createElement('div');
        const txtWrap = document.createElement('div');
        const leftImg = (idx % 2 === 0);
        imgWrap.className = leftImg ? 'md:order-1 order-1' : 'md:order-2 order-1';
        txtWrap.className = leftImg ? 'md:order-2 order-2' : 'md:order-1 order-2';

        // image block (pure CSS zigzag edge)
        const imgUrl = item.image || 'https://picsum.photos/seed/intro' + (idx+1) + '/1200/800';
        imgWrap.innerHTML = `
          <div class="intro-imgwrap ${leftImg ? 'zig-right' : 'zig-left'} shadow-lg">
            <img src="${imgUrl}" alt="${item.title || ''}" class="w-full h-64 md:h-80 object-cover">
          </div>
        `;

        // text block
        txtWrap.innerHTML = `
          <div class="pl-8 p-2 md:p-3 md:text-left">
            <h3 class="text-2xl font-bold mb-2">${item.title || ''}</h3>
            <p class="text-lg text-gray-700 dark:text-gray-300">${item.text || ''}</p>
            <div class="collapse-content mt-3">
              <p class="text-base md:text-lg text-gray-700 dark:text-gray-200">${item.details || ''}</p>
            </div>
          </div>
        `;

        row.appendChild(imgWrap);
        row.appendChild(txtWrap);

        // toggle collapse on text click
        row.addEventListener('click', (e) => {
          // avoid toggling when clicking links inside
          if (e.target && e.target.closest('a')) return;
          const open = row.classList.toggle('is-open');
          // close others
          intro.querySelectorAll('.intro-row.is-open').forEach(el => { if (el !== row) el.classList.remove('is-open'); });
        });

        intro.appendChild(row);
      });

      // reveal on scroll（桌機）；手機直接顯示
      try {
        const els = intro.querySelectorAll('.reveal-item');
        if (isMobile) {
          els.forEach(el => el.classList.add('show'));
        } else {
          const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
              if (en.intersectionRatio >= 0.5) {
                en.target.classList.add('show');
              } else {
                en.target.classList.remove('show');
              }
            });
          }, { threshold: [0, 0.5, 1] });
          els.forEach(el => io.observe(el));
        }
      } catch(e) {}
    }

    const featured = document.getElementById('featured-cases');
    if (featured) {
      const providers = window.providersData || {};
      // 帶入缺漏的 id（以鍵名補上），避免連結失效
      const featuredProviders = Object.entries(providers)
        .map(([k,p]) => p && p.featuredOnIndex ? { ...p, id: p.id || k } : null)
        .filter(Boolean);
      featured.innerHTML = '';
      const src = featuredProviders.length ? featuredProviders : (data.featured || []).map(x => ({
        name: x.title, description: x.text, id: (x.link||'').split('=')[1] || ''
      }));
      src.forEach(p => {
        const wrap = document.createElement('div');
        wrap.className = 'bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden';
        const inner = document.createElement('div');
        inner.className = 'p-6 transition-transform duration-200 hover:-translate-y-0.5';
        const href = p.id ? `./provider.html?id=${encodeURIComponent(p.id)}` : (p.link || '#');
        inner.innerHTML = `
          <h3 class="text-xl font-bold mb-2">${p.name || p.title}</h3>
          <p class="text-gray-600 dark:text-gray-400">${p.description || p.text || ''}</p>
          <a href="${href}" class="link-soft link-purple mt-4 inline-block transition-colors duration-200">閱讀更多</a>
        `;
        wrap.appendChild(inner);
        featured.appendChild(wrap);
      });
    }
  }

  function init() {
    renderIndex();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-render when remote datasets updated
  try {
    const EVT = (window.DataAPI && window.DataAPI.EVENT) || 'data:updated';
    document.addEventListener(EVT, (ev) => {
      const ds = (window.AppConfig && window.AppConfig.datasets) || { providers: 'providers', site: 'siteContent' };
      const keys = (ev && ev.detail && ev.detail.keys) || [];
      if (!keys.length || keys.includes(ds.providers) || keys.includes(ds.site)) {
        renderIndex();
      }
    });
  } catch (e) {}
})();
