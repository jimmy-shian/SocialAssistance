(function () {
  function qs(s, r = document) { return r.querySelector(s); }
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function achievementText(item) {
    if (typeof item === 'string') return { text: item, href: '' };
    return { text: item && (item.text || item.title) || '', href: item && item.href || '' };
  }
  function render() {
    const root = qs('#services-root');
    if (!root) return;
    const data = window.servicesContent || {};
    const about = window.aboutContent || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const achievements = Array.isArray(data.achievements) ? data.achievements : (about.achievements || []);
    const gallery = Array.isArray(data.gallery) && data.gallery.length ? data.gallery : items.map(x => x.image).filter(Boolean);
    root.innerHTML = `
      <header class="text-center max-w-3xl mx-auto mb-12">
        <span class="ui-eyebrow text-[var(--primary)] font-bold tracking-wider">SERVICES</span>
        <h1 class="heading-display mt-3">${esc(data.title || '服務項目')}</h1>
        <p class="lead-text mt-4 text-[var(--text-secondary)]">${esc(data.lead || '')}</p>
      </header>

<section class="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
  ${items.map((item, i) => {
    const spanMap = {0:'md:col-span-8',1:'md:col-span-4',2:'md:col-span-4',3:'md:col-span-8',4:'md:col-span-6',5:'md:col-span-3',6:'md:col-span-3'};
    const span = spanMap[i] || 'md:col-span-1';
    const delay = (i * 0.05).toFixed(2);
    return `
      <article class="service-feature-card glass-surface rounded-xl overflow-hidden ${span} transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-6 hover:scale-105 active:scale-97" style="animation-delay:${delay}s">
        <div class="service-feature-image">
          ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.title)}">` : ''}
        </div>
        <div class="p-6">
          <div class="text-sm font-mono text-[var(--primary)] mb-2">${String(i + 1).padStart(2, '0')}</div>
          <h2 class="text-xl font-bold mb-3">${esc(item.title)}</h2>
          <p class="text-[var(--text-secondary)] leading-relaxed">${esc(item.desc)}</p>
        </div>
      </article>
    `;
  }).join('')}
</section>

      <section class="mt-16 glass-surface rounded-xl p-6 md:p-8">
        <h2 class="heading-section mb-6">${esc(data.achievementsTitle || about.achievementsTitle || '成就經歷')}</h2>
        <div class="grid md:grid-cols-2 gap-4">
          ${achievements.map((a) => {
            const row = achievementText(a);
            const inner = `<span>${esc(row.text)}</span>`;
            return row.href
              ? `<a class="achievement-pill" href="${esc(row.href)}" target="_blank" rel="noopener">${inner}<span>→</span></a>`
              : `<div class="achievement-pill">${inner}</div>`;
          }).join('')}
        </div>
      </section>

      <section class="service-gallery-full mt-16" aria-label="服務照片輪播">
        <div class="service-gallery-track">
          ${gallery.concat(gallery).map((src, i) => `<img src="${esc(src)}" alt="服務照片 ${i + 1}" loading="lazy">`).join('')}
        </div>
      </section>
    `;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
