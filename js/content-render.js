// Injects textual content from siteContent.js to pages that declare placeholders
(function () {
  const content = window.siteContent || {};

  function renderIndex() {
    if (!content.index) return;
    const data = content.index;

    const h1 = document.getElementById('hero-title');
    const p = document.getElementById('hero-subtitle');
    if (h1) h1.textContent = data.heroTitle || h1.textContent;
    if (p) {
      const html = data.heroSubtitle || p.textContent;
      // 支援含超連結的 HTML
      p.innerHTML = html;
    }

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
      const featuredProviders = Object.values(providers).filter(p => p && p.featuredOnIndex);
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
