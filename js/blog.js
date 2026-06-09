(function () {
  const categoryLabels = {
    daily: '聽見日常',
    news: '重要通知',
    interview: '人物專訪',
    glory: '榮耀時刻'
  };

  const grid = document.getElementById('blog-grid');
  const glorySection = document.getElementById('blog-glory-section');
  const tabs = Array.from(document.querySelectorAll('.blog-tab'));
  const loadMoreBtn = document.getElementById('btn-load-more');
  let visibleCount = 6;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function posts() {
    return (window.blogContent && Array.isArray(window.blogContent.posts)) ? window.blogContent.posts : [];
  }

  function renderTimeline(post) {
    const rows = Array.isArray(post.timeline) && post.timeline.length
      ? post.timeline
      : [{ time: post.date, title: post.title, detail: post.excerpt }];

    return `<div class="blog-timeline">${rows.map((row, index) => `
      <div class="blog-timeline-item" style="--step:${index}">
        <span>${esc(row.time)}</span>
        <strong>${esc(row.title)}</strong>
        <p>${esc(row.detail)}</p>
      </div>
    `).join('')}</div>`;
  }

  function renderStandardPost(post, index) {
    return `
      <article class="blog-post-card" role="button" tabindex="0" data-post-id="${esc(post.id)}" data-category="${esc(post.category)}">
        <div class="blog-post-image">
          <img src="${esc(post.image)}" alt="${esc(post.title)}" loading="lazy">
          <span class="blog-post-tag" data-category="${esc(post.category)}">${esc(categoryLabels[post.category] || post.category)}</span>
        </div>
        <div class="blog-post-content">
          <h3>${esc(post.title)}</h3>
          <p class="blog-post-date">${esc(post.date)}</p>
          <p class="blog-post-excerpt">${esc(post.excerpt)}</p>
        </div>
      </article>
    `;
  }

  function renderGloryPost(post, index) {
    return `
      <article class="blog-glory-feature" style="--stack:${index}" data-post-id="${esc(post.id)}" data-category="glory">
        <div class="blog-glory-media">
          <img src="${esc(post.image)}" alt="${esc(post.title)}" loading="lazy">
          <span class="blog-post-tag" data-category="glory">${esc(categoryLabels.glory)}</span>
        </div>
        <div class="blog-glory-copy">
          <div class="blog-glory-eyebrow">Glory Timeline</div>
          <h3 class="blog-glory-title">${esc(post.title)}</h3>
          <p class="blog-glory-summary">${esc(post.excerpt || post.content || '')}</p>
          ${renderTimeline(post)}
        </div>
      </article>
    `;
  }

  function renderGlorySection(category, allPosts) {
    if (!glorySection) return;
    const gloryPosts = allPosts.filter(post => post.category === 'glory');
    const shouldShow = category === 'all' || category === 'glory';
    glorySection.hidden = !shouldShow || !gloryPosts.length;
    if (glorySection.hidden) {
      glorySection.innerHTML = '';
      return;
    }
    glorySection.innerHTML = `
      <div class="blog-glory-header">
        <span>榮耀時刻</span>
        <h2>條列式成長時間軸</h2>
      </div>
      <div class="blog-glory-stack">
        ${gloryPosts.map((post, index) => renderGloryPost(post, index)).join('')}
      </div>
    `;
  }

  function renderPosts(category = 'all') {
    if (!grid) return;
    const allPosts = posts();
    renderGlorySection(category, allPosts);
    const withoutGlory = allPosts.filter(post => post.category !== 'glory');
    const filtered = category === 'all'
      ? withoutGlory
      : category === 'glory'
        ? []
        : withoutGlory.filter(post => post.category === category);
    const toShow = filtered.slice(0, visibleCount);

    grid.classList.toggle('is-hidden', category === 'glory');
    grid.innerHTML = toShow.map((post, index) => renderStandardPost(post, index)).join('');

    if (loadMoreBtn) {
      loadMoreBtn.hidden = category === 'glory' || toShow.length >= filtered.length;
    }
  }

  function ensureBlogModal() {
    let modal = document.getElementById('blog-lightbox-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'blog-lightbox-modal';
    modal.className = 'blog-lightbox-modal blog-spatial-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="blog-lightbox-backdrop" data-close-blog></div>
      <article class="blog-lightbox-panel" role="dialog" aria-modal="true" aria-labelledby="blog-modal-title">
        <button type="button" class="blog-lightbox-close" data-close-blog aria-label="關閉">×</button>
        <div class="blog-lightbox-body"></div>
      </article>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-blog]')) closeBlogModal(modal);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeBlogModal(modal);
    });

    return modal;
  }

  function closeBlogModal(modal = document.getElementById('blog-lightbox-modal')) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open', 'blog-spatial-open');
    document.querySelectorAll('.blog-post-card.is-opening').forEach(card => card.classList.remove('is-opening'));
  }

  function openPost(post, sourceCard) {
    const modal = ensureBlogModal();
    const body = modal.querySelector('.blog-lightbox-body');
    const label = categoryLabels[post.category] || post.category;
    body.innerHTML = `
      <div class="blog-modal-hero">
        <img src="${esc(post.image)}" alt="${esc(post.title)}">
      </div>
      <div class="blog-modal-meta">${esc(label)}</div>
      <h2 class="blog-modal-title" id="blog-modal-title">${esc(post.title)}</h2>
      <p class="blog-modal-date">${esc(post.date)}</p>
      <div class="blog-modal-content">
        ${post.category === 'glory'
          ? renderTimeline(post)
          : `<p>${esc(post.content || post.excerpt || '')}</p>`}
      </div>
    `;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    sourceCard?.classList.add('is-opening');
    document.body.classList.add('modal-open', 'blog-spatial-open');
    requestAnimationFrame(() => modal.querySelector('.blog-lightbox-close')?.focus({ preventScroll: true }));
  }

  function openFromCard(card) {
    const post = posts().find(item => String(item.id) === String(card.dataset.postId));
    if (post && post.category !== 'glory') openPost(post, card);
  }

  function init() {
    if (!grid) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(item => item.classList.remove('active'));
        tab.classList.add('active');
        visibleCount = 6;
        renderPosts(tab.dataset.category || 'all');
      });
    });

    loadMoreBtn?.addEventListener('click', () => {
      visibleCount += 3;
      const activeTab = document.querySelector('.blog-tab.active');
      renderPosts(activeTab?.dataset.category || 'all');
    });

    grid.addEventListener('click', (event) => {
      const card = event.target.closest('[data-post-id]');
      if (card) openFromCard(card);
    });

    grid.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('[data-post-id]');
      if (!card) return;
      event.preventDefault();
      openFromCard(card);
    });

    renderPosts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
