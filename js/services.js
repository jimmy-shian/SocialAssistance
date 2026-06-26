(function () {
  const root = document.getElementById('services-root');
  const data = window.servicesContent || {};
  const about = window.aboutContent || {};
  if (!root) return;
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"'); }
  const items = Array.isArray(data.items) ? data.items : [];
  const serviceImages = items.map(item => item.image).filter(Boolean);
  root.innerHTML = `
    <section class="container page-hero">
      <span class="page-hero__label">service</span>
      <h1>${esc(data.title || '服務項目')}</h1>
      <p class="page-hero__lead">${esc(data.lead || '')}</p>
    </section>
    <section class="section section-soft">
      <div class="container service-detail-list">
        ${items.map((item, i) => `
          <article class="service-detail service-detail--scroll" id="service-${i + 1}">
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
    ${serviceImages.length ? `
    <section class="section section-soft">
      <div class="container-wide">
        <span class="section-label">gallery</span>
        <h2>活動現場</h2>
        <div class="gallery-carousel-wrapper" style="margin-top:24px">
          <div class="gallery-carousel-track">
            ${[...serviceImages, ...serviceImages].map(src => `
              <div class="gallery-carousel-item">
                <img src="${esc(src)}" alt="服務照片" loading="lazy">
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>` : ''}`;

  // Intersection Observer: 邊捲動邊呈現動態效果
  var scrollEls = root.querySelectorAll('.service-detail--scroll');
  if ('IntersectionObserver' in window && scrollEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    scrollEls.forEach(function (el) { observer.observe(el); });
  } else {
    // Fallback: 不支援時直接顯示
    scrollEls.forEach(function (el) { el.classList.add('is-visible'); });
  }
})();