(function () {
  const root = document.getElementById('provider-root');
  if (!root) return;
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"'); }
  function getId() { return new URL(location.href).searchParams.get('id'); }
  const id = getId();
  const provider = (window.providersData || {})[id];
  const blogPosts = (window.blogContent && Array.isArray(window.blogContent.posts)) ? window.blogContent.posts : [];
  if (!provider) {
    root.innerHTML = `<section class="page-hero"><h1>找不到此探索場域</h1><p class="page-hero__lead">請回到探索資源重新選擇。</p><a class="button-primary" href="./explore.html">回探索資源</a></section>`;
    return;
  }

  const heroImage = (provider.images && provider.images[0]) || '';
  const timeline = Array.isArray(provider.timeline) ? provider.timeline : [];
  const cases = Array.isArray(provider.cases) ? provider.cases : [];
  const allCaseImages = cases.flatMap(c => Array.isArray(c.images) ? c.images : []).slice(0, 12);
  const returnUrl = encodeURIComponent(location.href);
  const returnUrlWithHash = encodeURIComponent(location.href.split('#')[0] + '#interview');

  function listBlock(title, items) {
    return `<div class="plain-list-block interactive-lift"><h3>${esc(title)}</h3><ul>${(items || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  }

  function normalize(text) {
    return String(text || '').replace(/[\s。．・,，、]/g, '').replace(/專訪/g, '').toLowerCase();
  }

  function findInterview(item) {
    if (item && item.relatedBlogPostId) return blogPosts.find(p => String(p.id) === String(item.relatedBlogPostId));
    const providerKey = normalize(provider.name);
    return blogPosts.find(p => p.category === 'interview' && normalize(p.title).includes(providerKey)) || null;
  }

  const relatedInterview = timeline.map(findInterview).find(Boolean) || findInterview(null);

  root.innerHTML = `
    <div class="provider-layout">
      <aside class="side-panel">
        <a class="button-text" href="./explore.html">← 回探索資源</a>
        <h2 style="margin-top:18px">${esc(provider.name)}</h2>
        <dl class="info-list">
          <div><dt>類別</dt><dd>${esc(provider.category || '-')}</dd></div>
          <div><dt>地區</dt><dd>${esc(provider.location || '-')}</dd></div>
        </dl>
  <div class="anchor-list" aria-label="頁內導覽">
    <a href="#intro" class="smooth-scroll-link">場域介紹</a>
    <a href="#outcomes" class="smooth-scroll-link">學習收穫</a>
    <a href="#timeline" class="smooth-scroll-link">課程安排</a>
    ${relatedInterview ? '<a href="#interview" class="smooth-scroll-link">人物專訪</a>' : ''}
    <a href="#cases" class="smooth-scroll-link">精選案例</a>
  </div>
  ${false ? `<a class="button-primary" style="margin-top:18px;width:100%" href="${esc(provider.gmapUrl)}" target="_blank" rel="noopener">Google 地圖</a>` : ''}
      </aside>
      <article>
        <nav class="date-text" aria-label="麵包屑"><a href="./explore.html">探索資源</a> / ${esc(provider.name)}</nav>
        <header class="provider-hero" id="intro" style="margin-top:18px">
          <div>
            <span class="section-label">${esc(provider.category || 'resource')}</span>
            <h1>${esc(provider.name)}</h1>
            <p class="page-hero__lead">${esc(provider.description || '')}</p>
          </div>
          <button type="button" class="image-frame provider-hero__image interactive-image" id="provider-hero-image">${heroImage ? `<img src="${esc(heroImage)}" alt="${esc(provider.name)}" fetchpriority="high">` : ''}</button>
        </header>

        <section class="content-band" id="outcomes">
          <span class="section-label">outcomes</span>
          <h2>這趟體驗會帶走什麼</h2>
          <div class="three-column-list" style="margin-top:22px">
            ${listBlock('知道', provider.know)}
            ${listBlock('學會', provider.learn)}
            ${listBlock('帶走', provider.gain)}
          </div>
        </section>

        <section class="content-band" id="timeline">
          <span class="section-label">schedule</span>
          <h2>課程安排</h2>
          <div class="flow-list" style="margin-top:24px">
            ${timeline.map((item, index) => {
              const interview = findInterview(item);
              return `<article class="flow-item interactive-line">
                <div class="flow-step"><span>流程</span><strong>${String(index + 1).padStart(2, '0')}</strong></div>
                <div>
                  <h3>${esc(item.title || '')}</h3>
                  <p>${esc(item.detail || '')}</p>
                  ${Array.isArray(item.images) && item.images.length ? `<div class="timeline-media-grid">${item.images.slice(0, 3).map((src, i) => `<button type="button" data-lightbox="${esc(item.images.join('|'))}" data-index="${i}" aria-label="查看圖片 ${i+1}"><span class="image-frame interactive-image"><img src="${esc(src)}" alt="${esc(item.title)}" loading="lazy"></span></button>`).join('')}</div>` : ''}
                </div>
              </article>`;
            }).join('')}
          </div>
        </section>

        ${relatedInterview ? `<section class="content-band" id="interview">
          <span class="section-label">interview</span>
          <h2>人物專訪</h2>
          <article class="article-row provider-interview-card interactive-row">
            <a class="image-frame article-row__image interactive-image" href="./blog.html?id=${encodeURIComponent(relatedInterview.id)}&from=${returnUrlWithHash}">${relatedInterview.image ? `<img src="${esc(relatedInterview.image)}" alt="${esc(relatedInterview.title)}" loading="lazy">` : ''}</a>
          <div>
            <div class="article-row__meta"><span class="category-pill">人物專訪</span><span class="date-text">${esc(relatedInterview.date || '')}</span></div>
            <h3><a href="./blog.html?id=${encodeURIComponent(relatedInterview.id)}&from=${returnUrlWithHash}">${esc(relatedInterview.title)}</a></h3>
            <p class="line-clamp-3">${esc(relatedInterview.excerpt || relatedInterview.content || '')}</p>
            <a class="button-text" href="./blog.html?id=${encodeURIComponent(relatedInterview.id)}&from=${returnUrlWithHash}">前往閱讀 →</a>
          </div>
          </article>
        </section>` : ''}


        <section class="content-band" id="cases">
          <span class="section-label">cases</span>
          <h2>精選案例</h2>
          ${cases.map(c => `<div style="margin-top:22px"><h3>${esc(c.title)}</h3>${c.summary ? `<p>${esc(c.summary)}</p>` : ''}</div>`).join('')}
          ${allCaseImages.length ? `<div class="case-gallery">${allCaseImages.map((src, i) => `<button type="button" data-lightbox="${esc(allCaseImages.join('|'))}" data-index="${i}"><span class="image-frame interactive-image"><img src="${esc(src)}" alt="案例照片" loading="lazy"></span></button>`).join('')}</div>` : ''}
        </section>
      </article>
    </div>`;

  function openLightbox(sources, index) {
    if (window.Lightbox) window.Lightbox.ensureLightbox().open(index, sources);
  }
  document.querySelectorAll('[data-lightbox]').forEach(btn => btn.addEventListener('click', () => {
    const sources = (btn.dataset.lightbox || '').split('|').filter(Boolean);
    openLightbox(sources, Number(btn.dataset.index || 0));
  }));
  const heroBtn = document.getElementById('provider-hero-image');
  if (heroBtn && heroImage) heroBtn.addEventListener('click', () => openLightbox(provider.images || [heroImage], 0));

  // Smooth scroll for side-panel anchor links, guaranteed within 1 second
  // Uses custom easing to bypass potential CSS transition interference
  root.querySelectorAll('.smooth-scroll-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (!targetElement) return;
      const headerOffset = 96; // match scroll-padding-top for sticky header
      const targetY = targetElement.getBoundingClientRect().top + window.scrollY - headerOffset;
      const startY = window.scrollY;
      const distance = targetY - startY;
      if (Math.abs(distance) < 5) return; // already at target
      const duration = Math.min(800, Math.max(300, Math.abs(distance) * 0.4)); // within 1 second
      const startTime = performance.now();
      function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
      function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        window.scrollTo(0, startY + distance * easeOutCubic(progress));
        if (progress < 1) requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    });
  });

  // Handle hash scrolling on page load (since elements are rendered dynamically)
  if (location.hash) {
    const targetId = location.hash.substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      setTimeout(() => {
        const headerOffset = 96;
        const targetY = targetElement.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }, 100);
    }
  }
})();