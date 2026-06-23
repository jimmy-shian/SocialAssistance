(function () {
  const root = document.getElementById('services-root');
  const data = window.servicesContent || {};
  const about = window.aboutContent || {};
  if (!root) return;
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  const items = Array.isArray(data.items) ? data.items : [];
  const achievements = Array.isArray(data.achievements) ? data.achievements : (about.achievements || []);
  root.innerHTML = `
    <section class="container page-hero">
      <span class="page-hero__label">service</span>
      <h1>${esc(data.title || '服務項目')}</h1>
      <p class="page-hero__lead">${esc(data.lead || '')}</p>
    </section>
    <section class="section section-soft">
      <div class="container service-detail-list">
        ${items.map((item, i) => `
          <article class="service-detail" id="service-${i + 1}">
            <div class="image-frame">${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.title)}" loading="lazy">` : ''}</div>
            <div class="stack-sm">
              <span class="section-label">${String(i + 1).padStart(2, '0')}</span>
              <h2>${esc(item.title)}</h2>
              <p class="section-lead">${esc(item.desc || '')}</p>
              <p>${esc(item.detail || item.content || '')}</p>
            </div>
          </article>`).join('')}
      </div>
    </section>
    ${achievements.length ? `<section class="section"><div class="container"><span class="section-label">records</span><h2>${esc(data.achievementsTitle || about.achievementsTitle || '成就經歷')}</h2><div class="stat-strip" style="margin-top:24px">${achievements.map(a => `<div><strong class="text-primary">${esc(typeof a === 'string' ? a : a.text)}</strong></div>`).join('')}</div></div></section>` : ''}
    ${Array.isArray(data.gallery) && data.gallery.length ? `<section class="section section-soft"><div class="container-wide"><span class="section-label">gallery</span><h2>活動現場</h2><div class="photo-ribbon" style="margin-top:24px">${data.gallery.map(src => `<div class="image-frame"><img src="${esc(src)}" alt="服務照片" loading="lazy"></div>`).join('')}</div></div></section>` : ''}`;
})();
