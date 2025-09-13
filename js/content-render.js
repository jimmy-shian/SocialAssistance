// Injects textual content from siteContent.js to pages that declare placeholders
(function () {
  const content = window.siteContent || {};

  function renderIndex() {
    if (!content.index) return;
    const data = content.index;

    const h1 = document.getElementById('hero-title');
    const p = document.getElementById('hero-subtitle');
    if (h1) h1.textContent = data.heroTitle || h1.textContent;
    if (p) p.textContent = data.heroSubtitle || p.textContent;

    const intro = document.getElementById('platform-intro');
    if (intro && Array.isArray(data.platformIntro)) {
      intro.innerHTML = '';
      data.platformIntro.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'intro-card p-6 shadow-lg rounded-lg bg-gray-50 dark:bg-gray-800 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl text-left';
        const accent = idx % 3 === 0 ? 'from-blue-500/10' : idx % 3 === 1 ? 'from-green-500/10' : 'from-purple-500/10';
        card.style.backgroundImage = 'linear-gradient(to right, transparent, transparent)';
        card.innerHTML = `
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold mb-2">${item.title}</h3>
          </div>
          <p class="text-gray-700 dark:text-gray-300">${item.text}</p>
          <div class="collapse-content">
            <p class="text-sm text-gray-700 dark:text-gray-200">${item.details || ''}</p>
          </div>
        `;
        card.addEventListener('click', () => {
          const open = card.classList.toggle('is-open');
          // close others
          intro.querySelectorAll('.intro-card.is-open').forEach(el => {
            if (el !== card) el.classList.remove('is-open');
          });
          if (!open) return;
        });
        intro.appendChild(card);
      });

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
          <a href="${href}" class="text-blue-500 hover:underline mt-4 inline-block transition-colors duration-200">閱讀更多</a>
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
