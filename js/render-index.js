(function () {
  const root = document.getElementById('home-root');
  const site = window.siteContent || {};
  const services = window.servicesContent || {};
  const about = window.aboutContent || {};
  const blog = window.blogContent || {};
  const providers = window.providersData || {};
  if (!root) return;

  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function strip(v) { return String(v || '').replace(/<[^>]+>/g, ''); }
  function rowText(item) { return typeof item === 'string' ? { text: item, href: '' } : { text: item && (item.text || item.title) || '', href: item && item.href || '' }; }
  function parseNumber(text) {
    const match = String(text || '').match(/(\d+)/);
    if (!match) return { num: '', prefix: '', suffix: text || '' };
    return { num: match[1], prefix: text.slice(0, match.index), suffix: text.slice(match.index + match[1].length) };
  }
  function drawSvg(label) {
    return `<svg class="draw-svg" viewBox="0 0 240 84" aria-hidden="true" focusable="false">
      <path d="M10 60 C52 8, 102 8, 135 36 S202 74, 230 22" />
      <path d="M36 72 C76 52, 116 54, 156 70" />
      <text x="18" y="25">${esc(label)}</text>
    </svg>`;
  }

  function sdgIconSvg(id, color) {
    const safeColor = esc(color || '#5f7f62');
    const icons = {
      4: '<path class="sdg-icon-path" d="M15 20l17-8 17 8-17 8-17-8Z"/><path class="sdg-icon-path" d="M21 26v11c7 5 15 5 22 0V26"/><path class="sdg-icon-path" d="M48 23v15"/><path class="sdg-icon-path" d="M16 45h22c5 0 8 2 10 6H23c-4 0-7-2-7-6Z"/>',
      10: '<path class="sdg-icon-path" d="M32 11v42"/><path class="sdg-icon-path" d="M19 20h26"/><path class="sdg-icon-path" d="M19 32h26"/><path class="sdg-icon-path" d="M19 44h26"/><path class="sdg-icon-path sdg-icon-fill" d="M17 14l-9 9 9 9v-7h8V21h-8v-7Z"/><path class="sdg-icon-path sdg-icon-fill" d="M47 50l9-9-9-9v7h-8v4h8v7Z"/>',
      11: '<path class="sdg-icon-path" d="M12 51h40"/><path class="sdg-icon-path" d="M16 51V31h10v20"/><path class="sdg-icon-path" d="M29 51V18h11v33"/><path class="sdg-icon-path" d="M43 51V26h9v25"/><path class="sdg-icon-path" d="M20 36h2M20 43h2M33 25h2M33 32h2M33 39h2M47 33h2M47 40h2"/>',
      17: '<circle class="sdg-icon-path" cx="32" cy="32" r="7"/><circle class="sdg-icon-path" cx="32" cy="18" r="8"/><circle class="sdg-icon-path" cx="44" cy="25" r="8"/><circle class="sdg-icon-path" cx="44" cy="39" r="8"/><circle class="sdg-icon-path" cx="32" cy="46" r="8"/><circle class="sdg-icon-path" cx="20" cy="39" r="8"/><circle class="sdg-icon-path" cx="20" cy="25" r="8"/>'
    };
    return '<svg class="sdg-icon-svg" viewBox="0 0 64 64" style="color:' + safeColor + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + (icons[id] || icons[17]) + '</svg>';
  }
  const hero = site.hero || {};
  const slides = Array.isArray(hero.slides) ? hero.slides : [];
  const serviceItems = Array.isArray(services.items) ? services.items : [];
  const posts = Array.isArray(blog.posts) ? blog.posts.slice(0, 4) : [];
  const featuredProviders = Object.values(providers).filter(p => p && p.featuredOnIndex).slice(0, 4);
  const sdgs = Array.isArray(site.sdgs) ? site.sdgs : [];
  const model = Array.isArray(about.model) ? about.model : [];
  const achievements = Array.isArray(about.achievements) ? about.achievements : [];
  const heroInfo = String(hero.info || '')
    .split(/<br\s*\/?>/i)
    .map(strip)
    .map(x => x.trim())
    .filter(Boolean);

  root.innerHTML = `
    <section class="container-wide home-hero">
      <div class="home-hero__copy">
        <span class="section-label">${esc(hero.label || 'sound core studio')}</span>
        <h1>${hero.title || '孩子成長路上的<br>陪跑者'}</h1>
        <p class="page-hero__lead">${esc(hero.subtitle || '聽見、看見、感受每個孩子的需要')}</p>
        <div class="home-hero__info">
          ${(heroInfo.length ? heroInfo : ['嘉義市西區車店里蘭州五街66號', '0988-368-450', '專業探索課程設計']).map(x => `<span>${esc(x)}</span>`).join('')}
        </div>
        <div class="action-row">
          <a class="button-primary" href="./explore.html">開始探索</a>
          <a class="button-secondary" href="./about.html">了解理念</a>
        </div>
      </div>
      <div class="home-hero__media" id="home-hero-media">
        ${slides.map((s, i) => `<img class="${i === 0 ? 'active' : ''}" src="${esc(s.img)}" alt="${esc(s.alt || '活動照片')}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>`).join('')}
        <div class="home-hero__dots">${slides.map((_, i) => `<button type="button" class="${i === 0 ? 'active' : ''}" data-slide="${i}" aria-label="切換照片 ${i + 1}"></button>`).join('')}</div>
      </div>
    </section>

    <section class="section section-soft">
      <div class="container-wide">
        <span class="section-label">service</span>
        <h2>以體驗、陪伴與實作，整理可被帶走的能力</h2>
        <div class="service-links" style="margin-top:28px">
          ${serviceItems.slice(0, 8).map((item, i) => `
            <a class="service-link interactive-lift" href="./services.html#service-${i + 1}">
              ${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.title)}" loading="lazy">` : ''}
              <strong>${esc(item.title)}</strong>
              <span class="text-soft">${esc(item.desc || '')}</span>
            </a>`).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container about-message">
        <div class="image-frame interactive-image">${site.philosophy && site.philosophy.img ? `<img src="${esc(site.philosophy.img)}" alt="理念照片" loading="lazy">` : ''}</div>
        <div>
          <span class="section-label">about</span>
          <h2>${site.philosophy ? site.philosophy.title : '在真實場域裡練習把自己站穩'}</h2>
          <p class="section-lead">${esc(site.philosophy ? site.philosophy.content : (about.lead || ''))}</p>
          <a class="button-text" href="./about.html">關於我們 →</a>
        </div>
      </div>
    </section>

    <section class="section section-soft home-impact" id="resources-impact">
      <div class="container-wide">
        <div class="section-heading-with-art">
          <div>
            <span class="section-label">foundation</span>
            <h2>SDGs、關於我們與成就經歷</h2>
            <p class="section-lead">把永續目標、團隊陪伴模型與累積成果放回首頁主節奏，讓訪客先理解我們如何支持孩子，再前往探索場域。</p>
          </div>
          ${drawSvg('connect')}
        </div>

        ${sdgs.length ? `<section class="home-subsection home-sdgs" id="sdgs">
          <div class="home-subsection__intro">
            <div>
              <span class="section-label">sdgs</span>
              <h2>符合聯合國永續發展目標</h2>
            </div>
          </div>
          <div class="sdg-lineup sdg-lineup--icon">
            ${sdgs.map((item, i) => `<a class="sdg-item sdg-item--icon" href="${esc(item.link || '#')}" target="_blank" rel="noopener" style="--sdg-color:${esc(item.color || '#5f7f62')};--i:${i}">
              <div class="sdg-icon-wrap sdg-draw-anim" style="--sdg-color:${esc(item.color || '#5f7f62')}">
                ${sdgIconSvg(item.id, item.color || '#5f7f62')}
                <svg class="sdg-border-svg" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="3" y="3" width="104" height="104" rx="10" stroke="${esc(item.color || '#5f7f62')}" stroke-width="3" stroke-dasharray="420" stroke-dashoffset="420"/>
                </svg>
              </div>
              <span><strong>${esc(item.title)}</strong><small>${esc(item.desc || '')}</small></span>
            </a>`).join('')}
          </div>
        </section>` : ''}

        ${model.length ? `<section class="home-subsection home-model" id="about-model">
          <div class="home-subsection__intro">
            <div>
              <span class="section-label">about</span>
              <h2>關於我們的陪伴模型</h2>
            </div>
            <a class="button-text" href="./about.html">完整關於我們 →</a>
          </div>
          <div class="model-list compact-model-list">
            ${model.map((item, i) => `<div class="model-row interactive-line"><div class="model-row__num">${String(i + 1).padStart(2, '0')}</div><div><h3>${esc(item.title)}</h3><p>${esc(item.desc)}</p></div></div>`).join('')}
          </div>
        </section>` : ''}

        ${achievements.length ? `<section class="home-subsection home-achievements" id="achievements">
          <div class="home-subsection__intro">
            <div>
              <span class="section-label">achievement</span>
              <h2>${esc(about.achievementsTitle || '成就經歷')}</h2>
            </div>
          </div>
          <div class="achievement-strip">
            ${achievements.map((item, i) => {
              const row = rowText(item);
              const parsed = parseNumber(row.text);
              const body = `<span class="achievement-number" data-to="${esc(parsed.num)}">${esc(parsed.num || '•')}</span><p>${esc(parsed.prefix)}${parsed.num ? `<strong>${esc(parsed.num)}</strong>` : ''}${esc(parsed.suffix)}</p>`;
              return row.href ? `<a class="achievement-item interactive-lift" href="${esc(row.href)}">${body}</a>` : `<div class="achievement-item interactive-lift">${body}</div>`;
            }).join('')}
          </div>
        </section>` : ''}
      </div>
    </section>

    <section class="section">
      <div class="container-wide">
        <span class="section-label">news</span>
        <h2>最新消息與活動紀錄</h2>
        <div style="margin-top:18px">
          ${posts.map(post => `
            <article class="article-row interactive-row">
              <a class="image-frame article-row__image interactive-image" href="./blog.html?id=${encodeURIComponent(post.id)}"><img src="${esc(post.image)}" alt="${esc(post.title)}" loading="lazy"></a>
              <div>
                <div class="article-row__meta"><span class="category-pill">${esc(post.category || '')}</span><span class="date-text">${esc(post.date || '')}</span></div>
                <h3><a href="./blog.html?id=${encodeURIComponent(post.id)}">${esc(post.title)}</a></h3>
                <p class="line-clamp-2">${esc(post.excerpt || post.content || '')}</p>
              </div>
            </article>`).join('')}
        </div>
        <a class="button-secondary" href="./blog.html" style="margin-top:24px">更多消息</a>
      </div>
    </section>

    <section class="section section-soft">
      <div class="container-wide">
        <span class="section-label">map</span>
        <h2>${esc((site.map && site.map.title) || '地區資源地圖')}</h2>
        <div class="action-row" style="margin:16px 0 18px">
          <button id="region-prev" class="button-secondary" type="button" aria-label="上一個地區">上一個</button>
          <div id="region-ticker" class="meta-pill">載入地區中</div>
          <button id="region-next" class="button-secondary" type="button" aria-label="下一個地區">下一個</button>
        </div>
        <div id="chiayi-map" class="soft-panel" style="height:420px;overflow:hidden"></div>
      </div>
    </section>`;

  const media = document.getElementById('home-hero-media');
  if (media) {
    const imgs = Array.from(media.querySelectorAll('img'));
    const dots = Array.from(media.querySelectorAll('button[data-slide]'));
    let idx = 0;
    function show(next) {
      if (!imgs.length) return;
      idx = next % imgs.length;
      imgs.forEach((img, i) => img.classList.toggle('active', i === idx));
      dots.forEach((dot, i) => dot.classList.toggle('active', i === idx));
    }
    dots.forEach(dot => dot.addEventListener('click', () => show(Number(dot.dataset.slide || 0))));
    if (imgs.length > 1) setInterval(() => show(idx + 1), 5200);
  }

  const revealTargets = root.querySelectorAll('.draw-svg, .achievement-item, .sdg-item, .sdg-icon-svg, .model-row');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        // SDG border draw animation
        const borderRect = entry.target.querySelector && entry.target.querySelector('.sdg-border-svg rect');
        if (borderRect) {
          borderRect.style.animation = 'sdgBorderDraw 1s cubic-bezier(0.2,0,0,1) forwards';
        }
        const num = entry.target.querySelector && entry.target.querySelector('.achievement-number');
        if (num && num.dataset.to && !num.dataset.done) {
          num.dataset.done = 'true';
          const target = Number(num.dataset.to || 0);
          let start = null;
          const tick = now => {
            if (start == null) start = now;
            const progress = Math.min(1, (now - start) / 1200);
            num.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });
    revealTargets.forEach(el => observer.observe(el));
  } else {
    revealTargets.forEach(el => {
      el.classList.add('is-visible');
    });
  }
})();





