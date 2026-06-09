(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function toast(message) {
    let el = $('#sc-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sc-toast';
      el.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(16px);opacity:0;background:rgba(23,33,29,.92);color:white;border-radius:999px;padding:12px 16px;z-index:200;transition:.3s cubic-bezier(.34,1.56,.64,1);pointer-events:none';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(16px)'; }, 2200);
  }

  window.addEventListener('sc:toast', (event) => toast(event.detail || '完成'));

  function sketchSvg() {
    return `<svg class="sketch" viewBox="0 0 620 220" fill="none" aria-hidden="true">
      <path d="M18 156 C92 58 162 60 214 118 C263 172 316 174 371 104 C427 34 522 38 593 128" stroke="#1e7d5f" stroke-width="9" stroke-linecap="round"/>
      <path d="M58 181 C144 135 236 134 334 174 C427 212 509 196 582 148" stroke="#c98b2c" stroke-width="6" stroke-linecap="round"/>
      <path d="M156 66 C170 42 193 31 221 38 C254 46 272 72 267 104" stroke="#d95d63" stroke-width="5" stroke-linecap="round"/>
    </svg>`;
  }

  function card(title, text, image, index, href) {
    const tag = href ? 'a' : 'article';
    const attr = href ? `href="${esc(href)}"` : '';
    return `<${tag} ${attr} class="sc-card public-card" style="--i:${index}">
      ${image ? `<div class="public-card-media"><img src="${esc(image)}" alt="${esc(title)}" loading="lazy"></div>` : ''}
      <div class="public-card-body">
        <h3>${esc(title)}</h3>
        ${text ? `<p class="sc-lead" style="font-size:.98rem">${esc(text)}</p>` : ''}
      </div>
    </${tag}>`;
  }

  function initHeroSlider(root) {
    const slides = $$('.hero-media img', root);
    const dots = $$('.hero-dot', root);
    if (slides.length < 2) return;
    let i = 0;
    const show = (next) => {
      i = next;
      slides.forEach((img, idx) => img.classList.toggle('active', idx === i));
      dots.forEach((dot, idx) => dot.classList.toggle('active', idx === i));
    };
    dots.forEach((dot, idx) => dot.addEventListener('click', () => show(idx)));
    setInterval(() => show((i + 1) % slides.length), 5200);
  }

  function renderIndex() {
    const root = $('#home-root');
    const data = window.siteContent || {};
    if (!root) return;
    const hero = data.hero || {};
    const slides = Array.isArray(hero.slides) && hero.slides.length ? hero.slides : [{ img: './img/index-bg.png', alt: 'Sound Core' }];
    root.innerHTML = `
      <section class="hero-public">
        <div class="sc-card hero-copy" style="--i:0">
          <span class="sc-eyebrow">${esc(hero.label || 'Sound Core Studio')}</span>
          <h1 class="sc-title">${hero.title || '孩子成長路上的陪跑者'}</h1>
          <p class="sc-lead">${hero.subtitle || ''}</p>
          ${hero.info ? `<p class="sc-lead" style="font-weight:800">${hero.info}</p>` : ''}
          <div class="hero-actions">
            ${(hero.buttons || [{ text: '開始探索', link: './explore.html', style: 'primary' }, { text: '了解服務', link: './services.html' }]).map((b) => `<a class="sc-btn ${b.style === 'primary' ? 'primary' : ''}" href="${esc(b.link || '#')}">${esc(b.text)}</a>`).join('')}
          </div>
          ${sketchSvg()}
        </div>
        <div class="sc-card hero-media" style="--i:1">
          ${slides.map((s, i) => `<img class="${i === 0 ? 'active' : ''}" src="${esc(s.img)}" alt="${esc(s.alt || '')}">`).join('')}
          <div class="hero-dots">${slides.map((_, i) => `<button class="hero-dot ${i === 0 ? 'active' : ''}" type="button" aria-label="切換主視覺 ${i + 1}"></button>`).join('')}</div>
        </div>
      </section>

      <section class="sc-section split-grid">
        <div class="sc-card split-image" style="--i:0"><img src="${esc(data.philosophy?.img || './img/_a799b8ef-9cac-4078-8e34-851a4c93d040_045c08ee4c.jpg')}" alt="理念"></div>
        <div class="sc-card split-copy" style="--i:1">
          <span class="sc-eyebrow">${esc(data.philosophy?.label || 'About')}</span>
          <h2 class="sc-section-title">${data.philosophy?.title || '穩定的笑容與溫柔'}</h2>
          <p class="sc-lead">${esc(data.philosophy?.content || '')}</p>
        </div>
      </section>

      <section class="sc-section">
        <h2 class="sc-section-title">服務項目</h2>
        <div class="card-grid">${(data.services || []).map((s, i) => card(s.title, s.desc, s.img, i, s.link || './services.html')).join('')}</div>
      </section>

      <section class="sc-section">
        <h2 class="sc-section-title">永續目標</h2>
        <div class="card-grid">${(data.sdgs || []).map((s, i) => `<a class="sc-card public-card" style="--i:${i}" href="${esc(s.link || '#')}" target="_blank" rel="noopener"><div class="public-card-body"><span class="sc-eyebrow">SDG ${esc(s.id)}</span><h3>${esc(s.title)}</h3><p class="sc-lead" style="font-size:.98rem">${esc(s.desc)}</p></div></a>`).join('')}</div>
      </section>

      <section class="sc-section">
        <h2 class="sc-section-title">${esc(data.resources?.title || '資源與部落格')}</h2>
        <div class="pill-row">${(data.resources?.tags || []).map((t) => `<a class="pill" href="${esc(t.link || './member.html')}">${esc(t.text)}</a>`).join('')}</div>
        <div class="card-grid" style="margin-top:16px">${(data.blogPosts || []).slice(0, 3).map((p, i) => card(p.title, p.excerpt || p.date, p.image, i, p.link || './blog.html')).join('')}</div>
      </section>`;
    initHeroSlider(root);
  }

  function renderAbout() {
    const root = $('#about-root');
    const data = window.aboutContent || {};
    if (!root) return;
    root.innerHTML = `
      <header class="sc-card hero-copy" style="--i:0">
        <span class="sc-eyebrow">About</span>
        <h1 class="sc-title">${esc(data.heroTitle || '關於我們')}</h1>
        <p class="sc-lead">${esc(data.lead || '')}</p>
        ${sketchSvg()}
      </header>
      <section class="sc-section">
        <h2 class="sc-section-title">${esc(data.modelTitle || '四階段引導模型')}</h2>
        <div class="card-grid">${(data.model || []).map((m, i) => `<article class="sc-card public-card" style="--i:${i}"><div class="public-card-body"><span class="sc-eyebrow">${String(i + 1).padStart(2, '0')}</span><h3>${esc(m.title)}</h3><p class="sc-lead" style="font-size:.98rem">${esc(m.desc)}</p>${m.href ? `<a class="sc-btn" href="${esc(m.href)}" target="_blank" rel="noopener">${esc(m.linkText || '了解更多')}</a>` : ''}</div></article>`).join('')}</div>
      </section>
      <section class="sc-section">
        <h2 class="sc-section-title">${esc(data.achievementsTitle || '成就經歷')}</h2>
        <div class="card-grid two">${(data.achievements || []).map((a, i) => {
          const row = typeof a === 'string' ? { text: a } : a;
          return `<${row.href ? 'a' : 'article'} ${row.href ? `href="${esc(row.href)}" target="_blank" rel="noopener"` : ''} class="sc-card public-card" style="--i:${i}"><div class="public-card-body"><p class="sc-lead">${esc(row.text || row.title || '')}</p></div></${row.href ? 'a' : 'article'}>`;
        }).join('')}</div>
      </section>
      <section class="sc-section">
        <h2 class="sc-section-title">Our Team</h2>
        <div class="card-grid">${(data.team || []).map((m, i) => card(m.name, [m.motto, ...(m.roles || [])].filter(Boolean).join(' / '), m.photo, i)).join('')}</div>
      </section>`;
  }

  function renderServices() {
    const root = $('#services-root');
    const data = window.servicesContent || {};
    const about = window.aboutContent || {};
    if (!root) return;
    const items = data.items || [];
    const gallery = data.gallery?.length ? data.gallery : items.map((x) => x.image).filter(Boolean);
    root.innerHTML = `
      <header class="sc-card hero-copy" style="--i:0">
        <span class="sc-eyebrow">Services</span>
        <h1 class="sc-title">${esc(data.title || '服務項目')}</h1>
        <p class="sc-lead">${esc(data.lead || '')}</p>
        ${sketchSvg()}
      </header>
      <section class="sc-section card-grid">${items.map((item, i) => card(item.title, item.desc, item.image, i)).join('')}</section>
      <section class="sc-section">
        <h2 class="sc-section-title">${esc(data.achievementsTitle || about.achievementsTitle || '成就經歷')}</h2>
        <div class="card-grid two">${(about.achievements || []).map((a, i) => {
          const row = typeof a === 'string' ? { text: a } : a;
          return `<article class="sc-card public-card" style="--i:${i}"><div class="public-card-body"><p class="sc-lead">${esc(row.text || '')}</p></div></article>`;
        }).join('')}</div>
      </section>
      <section class="sc-section card-grid">${gallery.map((src, i) => `<div class="sc-card split-image" style="--i:${i}"><img src="${esc(src)}" alt="服務照片 ${i + 1}" loading="lazy"></div>`).join('')}</section>`;
  }

  function providerList() {
    return Object.entries(window.providersData || {}).map(([id, p]) => ({ ...p, id: p.id || id }));
  }

  function renderExplore() {
    const root = $('#explore-root');
    if (!root) return;
    const categories = Array.from(new Set(providerList().map((p) => p.category).filter(Boolean)));
    root.innerHTML = `
      <header class="sc-card hero-copy" style="--i:0">
        <span class="sc-eyebrow">Explore</span>
        <h1 class="sc-title">探索資源平台</h1>
        <p class="sc-lead">搜尋在地產業、體驗場域與青少年生涯探索課程。</p>
        ${sketchSvg()}
      </header>
      <section class="filters">
        <input id="provider-search" class="sc-input" placeholder="搜尋名稱、地點、描述">
        <select id="provider-category" class="sc-select"><option value="">所有產業</option>${categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
        <button id="provider-filter" class="sc-btn primary" type="button">搜尋</button>
      </section>
      <section id="provider-grid" class="card-grid"></section>`;
    const draw = () => {
      const kw = ($('#provider-search')?.value || '').trim().toLowerCase();
      const cat = $('#provider-category')?.value || '';
      const rows = providerList().filter((p) => (!cat || p.category === cat) && (!kw || `${p.name} ${p.location} ${p.description}`.toLowerCase().includes(kw)));
      $('#provider-grid').innerHTML = rows.length ? rows.map((p, i) => card(p.name, `${p.category || ''}｜${p.location || ''}\n${p.description || ''}`, (p.images || [])[0], i, `./provider.html?id=${encodeURIComponent(p.id)}`)).join('') : '<p class="sc-lead">沒有符合條件的資源。</p>';
    };
    $('#provider-filter')?.addEventListener('click', draw);
    $('#provider-search')?.addEventListener('input', draw);
    $('#provider-category')?.addEventListener('change', draw);
    draw();
  }

  function renderProvider() {
    const root = $('#provider-root');
    if (!root) return;
    const id = new URL(location.href).searchParams.get('id');
    const p = (window.providersData || {})[id];
    if (!p) {
      root.innerHTML = `<section class="sc-card hero-copy"><h1 class="sc-title">找不到此資源</h1><a class="sc-btn primary" href="./explore.html">回探索資源</a></section>`;
      return;
    }
    const images = p.images?.length ? p.images : ['./img/DSC01739__8a8686e4b1.jpg'];
    root.innerHTML = `
      <header class="sc-card hero-copy" style="--i:0">
        <span class="sc-eyebrow">${esc(p.category || 'Provider')}</span>
        <h1 class="sc-title">${esc(p.name)}</h1>
        <p class="sc-lead">${esc(p.description || '')}</p>
        <div class="hero-actions"><a class="sc-btn primary" href="${esc(p.gmapUrl || '#')}" target="_blank" rel="noopener">查看地圖</a><a class="sc-btn" href="./explore.html">回列表</a></div>
        ${sketchSvg()}
      </header>
      <section class="sc-section split-grid">
        <div class="sc-card split-copy"><h2 class="sc-section-title">課程資訊</h2><p class="sc-lead"><strong>時間：</strong>${esc(p.schedule || '-')}</p><p class="sc-lead"><strong>地點：</strong>${esc([p.location, p.address].filter(Boolean).join(' ') || '-')}</p></div>
        <div class="sc-card split-image"><img src="${esc(images[0])}" alt="${esc(p.name)}"></div>
      </section>
      <section class="sc-section card-grid">
        ${['know', 'learn', 'gain'].map((key, i) => `<article class="sc-card public-card" style="--i:${i}"><div class="public-card-body"><h3>${key === 'know' ? '你將認識' : key === 'learn' ? '你將學到' : '你將獲得'}</h3><div class="pill-row">${(p[key] || []).map((x) => `<span class="pill">${esc(x)}</span>`).join('')}</div></div></article>`).join('')}
      </section>
      <section class="sc-section"><h2 class="sc-section-title">課程安排</h2><div class="timeline">${(p.timeline || []).map((t, i) => `<article class="sc-card timeline-row" style="--i:${i}"><div class="timeline-time">${esc(t.time)}</div><div><strong>${esc(t.title || '體驗活動')}</strong><p class="sc-lead" style="font-size:.98rem">${esc(t.detail)}</p></div></article>`).join('')}</div></section>
      <section class="sc-section"><h2 class="sc-section-title">活動照片</h2><div class="card-grid">${images.map((src, i) => `<div class="sc-card split-image" style="--i:${i}"><img src="${esc(src)}" alt="${esc(p.name)} ${i + 1}" loading="lazy"></div>`).join('')}</div></section>
      <section class="sc-section"><h2 class="sc-section-title">精選案例</h2><div class="card-grid">${(p.cases || []).map((c, i) => card(c.title, c.summary, (c.images || [])[0], i, c.video || '')).join('')}</div></section>`;
  }

  function renderBlog() {
    const root = $('#blog-root');
    if (!root) return;
    const labels = { daily: '聽見日常', news: '重要通知', interview: '人物專訪', glory: '榮耀時刻' };
    let active = 'all';
    root.innerHTML = `
      <header class="sc-card hero-copy" style="--i:0">
        <span class="sc-eyebrow">Blog</span>
        <h1 class="sc-title">部落格</h1>
        <p class="sc-lead">聽見日常、重要通知、人物專訪與榮耀時刻。</p>
        ${sketchSvg()}
      </header>
      <section class="sc-section pill-row" id="blog-tabs">
        ${['all', 'daily', 'news', 'interview', 'glory'].map((key) => `<button class="sc-btn ${key === 'all' ? 'primary' : ''}" type="button" data-cat="${key}">${esc(key === 'all' ? '全部' : labels[key])}</button>`).join('')}
      </section>
      <section id="blog-grid" class="card-grid"></section>`;
    const draw = () => {
      const posts = (window.blogContent?.posts || []).filter((p) => active === 'all' || p.category === active);
      $('#blog-grid').innerHTML = posts.map((p, i) => `<article class="sc-card public-card" style="--i:${i}" data-post="${esc(p.id)}">${p.image ? `<div class="public-card-media"><img src="${esc(p.image)}" alt="${esc(p.title)}"></div>` : ''}<div class="public-card-body"><span class="sc-eyebrow">${esc(labels[p.category] || p.category || 'Post')}</span><h3>${esc(p.title)}</h3><p class="sc-lead" style="font-size:.98rem">${esc(p.excerpt || p.content || '')}</p></div></article>`).join('');
    };
    $('#blog-tabs').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-cat]');
      if (!btn) return;
      active = btn.dataset.cat;
      $$('#blog-tabs .sc-btn').forEach((x) => x.classList.toggle('primary', x === btn));
      draw();
    });
    draw();
  }

  function init() {
    if (page === 'index.html' || page === '') renderIndex();
    if (page === 'about.html') renderAbout();
    if (page === 'services.html') renderServices();
    if (page === 'explore.html') renderExplore();
    if (page === 'provider.html') renderProvider();
    if (page === 'blog.html') renderBlog();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
