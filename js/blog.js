(function () {
  const root = document.getElementById('blog-root');
  if (!root) return;
  const labels = { all: '全部', daily: '聽見日常', news: '重要通知', interview: '人物專訪', glory: '榮耀時刻' };
  let active = 'all';
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function posts() { return (window.blogContent && Array.isArray(window.blogContent.posts)) ? window.blogContent.posts : []; }
  function filtered() { return active === 'all' ? posts() : posts().filter(p => p.category === active); }
  function parseTimelineTime(value) {
    const text = String(value || '');
    const year = Number((text.match(/(\d{2,3})\s*年/) || [0, 0])[1]);
    const month = Number((text.match(/年\s*(\d{1,2})\s*月/) || [0, 0])[1]);
    const fullYear = year > 1911 ? year : year + 1911;
    return fullYear * 100 + month;
  }
  function displayTimeline(post) {
    const timeline = Array.isArray(post.timeline) ? post.timeline.slice() : [];
    if (post.category === 'glory') timeline.sort((a, b) => parseTimelineTime(b.time) - parseTimelineTime(a.time));
    return timeline;
  }

  function postRow(post) {
    return `<article class="article-row interactive-row" data-post-id="${esc(post.id)}">
      <button type="button" class="image-frame article-row__image interactive-image">${post.image ? `<img src="${esc(post.image)}" alt="${esc(post.title)}" loading="lazy">` : ''}</button>
      <div>
        <div class="article-row__meta"><span class="category-pill">${esc(labels[post.category] || post.category || '')}</span><span class="date-text">${esc(post.date || '')}</span></div>
        <h3><button type="button" class="plain-button-title">${esc(post.title)}</button></h3>
        <p class="line-clamp-2">${esc(post.excerpt || post.content || '')}</p>
      </div>
    </article>`;
  }

  function scrollToListTitle() {
    const target = document.getElementById('blog-list-title') || root.querySelector('.page-hero');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function render(options = {}) {
    const list = filtered();
    const latest = posts().slice(0, 5);
    const cats = ['all', 'daily', 'news', 'interview', 'glory'];
    root.innerHTML = `
      <header class="page-hero">
        <span class="page-hero__label">news</span>
        <h1>最新消息</h1>
        <p class="page-hero__lead">整理活動紀錄、重要通知、人物專訪與團隊榮耀，讓合作單位與家長快速掌握近況。</p>
      </header>
      <div class="blog-layout">
        <aside class="side-panel">
          <h2>文章分類</h2>
          <div class="chip-list">${cats.map(c => `<button class="chip category-filter ${active === c ? 'active' : ''}" type="button" data-category="${c}">${labels[c]}</button>`).join('')}</div>
          <div style="margin-top:26px">
            <h3>新著文章</h3>
            <div class="footer-links" style="gap:12px">${latest.map(p => `<button type="button" class="button-text footer-copy" data-open="${esc(p.id)}">${esc(p.title)}</button>`).join('')}</div>
          </div>
        </aside>
        <section>
          <div id="blog-list-title" class="blog-list-heading"><h2 style="margin:0">${esc(labels[active])}</h2><span class="date-text">${list.length} 篇文章</span></div>
          <div>${list.map(postRow).join('')}</div>
        </section>
      </div>`;
    bind();
    if (options.scrollToTitle) requestAnimationFrame(scrollToListTitle);
  }

  function modalContent(post) {
    const body = post.content || post.excerpt || '';
    const images = Array.isArray(post.images) && post.images.length ? post.images : (post.image ? [post.image] : []);
    const timeline = displayTimeline(post);
    return `<div class="stack-sm">
      ${post.image ? `<div class="image-frame interactive-image" style="aspect-ratio:16/9;border-radius:var(--radius-card)"><img src="${esc(post.image)}" alt="${esc(post.title)}"></div>` : ''}
      <div class="article-row__meta"><span class="category-pill">${esc(labels[post.category] || post.category || '')}</span><span class="date-text">${esc(post.date || '')}</span></div>
      <h2 id="blog-modal-title">${esc(post.title)}</h2>
      ${body.split('\n').filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')}
      ${timeline.length ? `<div class="timeline-list blog-glory-timeline">${timeline.map(t => `<div class="timeline-item interactive-line"><div class="timeline-time">${esc(t.time)}</div><div><h3>${esc(t.title)}</h3><p>${esc(t.detail)}</p></div></div>`).join('')}</div>` : ''}
      ${images.length > 1 ? `<div class="case-gallery">${images.map((src, i) => `<button type="button" data-lightbox="${esc(images.join('|'))}" data-index="${i}"><span class="image-frame interactive-image"><img src="${esc(src)}" alt="文章照片" loading="lazy"></span></button>`).join('')}</div>` : ''}
      ${post.link && post.link !== './blog.html' ? `<a class="button-primary" href="${esc(post.link)}" target="_blank" rel="noopener">前往連結</a>` : ''}
    </div>`;
  }

  function openPost(id) {
    const post = posts().find(p => String(p.id) === String(id));
    if (!post) return;
    let modal = document.getElementById('blog-lightbox-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'blog-lightbox-modal';
      modal.className = 'blog-lightbox-modal';
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = '<div class="blog-lightbox-backdrop" data-close-blog></div><article class="blog-lightbox-panel" role="dialog" aria-modal="true" aria-labelledby="blog-modal-title"><button type="button" class="blog-lightbox-close" data-close-blog aria-label="關閉">×</button><div class="blog-lightbox-body"></div></article>';
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target.closest('[data-close-blog]')) closeModal(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    }
    modal.querySelector('.blog-lightbox-body').innerHTML = modalContent(post);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    modal.querySelectorAll('[data-lightbox]').forEach(btn => btn.addEventListener('click', () => {
      const sources = (btn.dataset.lightbox || '').split('|').filter(Boolean);
      if (window.Lightbox) window.Lightbox.ensureLightbox().open(Number(btn.dataset.index || 0), sources);
    }));
  }

  function closeModal() {
    const modal = document.getElementById('blog-lightbox-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function bind() {
    document.querySelectorAll('[data-category]').forEach(btn => btn.addEventListener('click', () => {
      active = btn.dataset.category || 'all';
      render({ scrollToTitle: true });
    }));
    document.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => openPost(btn.dataset.open)));
    document.querySelectorAll('[data-post-id]').forEach(row => row.addEventListener('click', () => openPost(row.dataset.postId)));
  }

  render();
  const id = new URL(location.href).searchParams.get('id');
  if (id) setTimeout(() => openPost(id), 80);
})();
