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


  function prepareStrokeDrawings(scope) {
    const area = scope || document;
    const targets = area.querySelectorAll('.draw-svg path, .sdg-border-svg rect, .nav-link-ring rect, .sdgs-path-svg path');
    targets.forEach(el => {
      if (!el || typeof el.getTotalLength !== 'function') return;
      const length = Math.ceil(el.getTotalLength());
      if (!Number.isFinite(length) || length <= 0) return;
      el.style.setProperty('--draw-length', String(length));
      el.style.setProperty('--draw-mid', String(Math.max(1, Math.round(length * 0.36))));
      el.style.strokeDasharray = String(length);
      el.style.strokeDashoffset = String(length);
    });
  }

  function prepareSdgCards(scope) {
    const area = scope || document;
    const cards = area.querySelectorAll('.sdg-card');
    cards.forEach(card => {
      const paths = card.querySelectorAll('.sdg-icon-path');
      paths.forEach(path => {
        path.setAttribute('pathLength', '1');
      });
    });
  }

  function sdgDrawableShapes(el) {
    if (!el) return [];
    return Array.from(el.querySelectorAll('.sdg-icon-path'));
  }

  function playSdgOnce(el) {
    const isSdg11 = el.classList.contains('sdg-card-11');
    const duration = isSdg11 ? '4.6s' : '4.2s';
    sdgDrawableShapes(el).forEach(path => {
      path.setAttribute('pathLength', '1');
      path.style.animation = 'none';
      path.style.fill = 'transparent';
      path.style.stroke = 'currentColor';
      path.style.strokeDasharray = '1';
      path.style.strokeDashoffset = '1';

      path.getBoundingClientRect(); // force reflow

      path.style.animation = `fast-draw-slow-end-fill ${duration} cubic-bezier(0.25, 0.9, 0.35, 1) forwards`;
    });
  }

  function resetSdgDrawing(el) {
    sdgDrawableShapes(el).forEach(path => {
      path.style.animation = 'none';
      path.style.transition = 'none';
      path.style.fill = 'currentColor';
      path.style.stroke = 'transparent';
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = 'none';
    });
  }

  function bootSdgIconAnimations(scope) {
    const area = scope || document;
    const items = Array.from(area.querySelectorAll('.sdg-card'));
    items.forEach(el => {
      if (el.dataset.sdgHoverBound === '1') return;
      el.dataset.sdgHoverBound = '1';
      el.addEventListener('mouseenter', () => playSdgOnce(el));
      el.addEventListener('mouseleave', () => resetSdgDrawing(el));
    });
  }

  function sdgIconSvg(id, color) {
    const safeColor = esc(color || '#5f7f62');
    const svgs = {
        4: `<svg viewBox="0 0 1000 458"><g fill="currentColor" fill-rule="evenodd"><path d="M443.4 134.2L264 30.6v335l179.4 54V134.3m19.6.7v285l180.6-54.4v-335L463 135M784.4 22.2C784.4 10.4 775 1 763.2 1S742 10.3 742 22v23h42.4V22.2m-37 337.5H742l21.2 74.2 21.2-74.5H779h5.4v-298H742v298h5.3"></path><path d="M682.2 45L663 29.8v345L463.6 439h-20.3L245 383.8v-354L225.8 45v352.2l216.7 60h22l200-63.5 17.7-5.2V45"></path></g></svg>`,
        10: `<svg viewBox="0 0 1000 547"><g fill="currentColor" fill-rule="evenodd"><path d="M595 304H403l-2 2v58l2 2h192l2-2v-58l-2-2m0-123H403c-1 0-2 1-2 3v57c0 2 1 3 2 3h192c1 0 2-1 2-3v-57c0-2-1-3-2-3m-3-87L500 2h-2l-92 92c-1 1 0 3 1 3h184c2 0 2-2 1-3m87 273l92-92v-2l-92-92c-1-1-3-1-3 1v184c0 1 2 2 3 1m-273 86l92 92h2l92-92c1-1 1-2-1-2H407c-1 0-2 1-1 2m-86-272l-93 92v2l93 92c1 1 2 0 2-1V182c0-2-1-2-2-1"></path></g></svg>`,
        11: `<svg viewBox="0 0 1000 508"><g fill="currentColor" fill-rule="evenodd"><path d="M165 367.3h150.5c2 0 3.6-1.7 3.6-3.7 0-1-.2-1.8-.8-2.4l-.2-.3-75-97-.6-.7c-.7-.7-1.6-1.2-2.7-1.2-1 0-1.8.5-2.4 1l-.5.6-.7.8-73 95.8-1 1.3c-.4.6-.7 1.3-.7 2 0 2 1.7 3.8 3.7 3.8M315 381H164.3c-2 0-3.7 1.6-3.7 3.6v118c0 2 1.6 3.7 3.7 3.7h48.5V432c0-2 1.6-3.6 3.7-3.6h45c2 0 3.7 1.6 3.7 3.7v74.3H315c2 0 3.7-1.7 3.7-3.7v-118c0-2-1.7-3.6-3.7-3.6M822.4 398.4c0 2-1.6 3.5-3.6 3.5h-44.6c-2 0-3.7-1.7-3.7-3.6v-27c0-2 1.7-3.7 3.7-3.7h44.6c2 0 3.6 1.6 3.6 3.6v27zm0 50c0 2-1.6 3.6-3.6 3.6h-44.6c-2 0-3.7-1.6-3.7-3.6v-27c0-2 1.7-3.6 3.7-3.6h44.6c2 0 3.6 1.6 3.6 3.5v27zm-68-50c0 2-1.7 3.5-3.8 3.5H706c-2 0-3.6-1.7-3.6-3.6v-27c0-2 1.7-3.7 3.7-3.7h44.6c2 0 3.7 1.6 3.7 3.6v27zm0 50c0 2-1.7 3.6-3.8 3.6H706c-2 0-3.6-1.6-3.6-3.6v-27c0-2 1.7-3.6 3.7-3.6h44.6c2 0 3.7 1.6 3.7 3.5v27zm81.5-98.3H686.6c-2 0-3.6 1.6-3.6 3.6v150.7c0 2 1.7 3.5 3.7 3.5H836c2 0 3.6-1.6 3.6-3.5V353.6c0-2-1.7-3.5-3.7-3.5zM468 107.5c0 1-1 2-2 2h-33.5c-1 0-2-1-2-2V70.2c0-1 1-2 2-2H466c1 0 2 1 2 2v37.3zm0 85.5c0 1-1 2-2 2h-33.5c-1 0-2-1-2-2v-37.2c0-1 1-2 2-2H466c1 0 2 1 2 2V193zm0 85.6c0 1-1 2-2 2h-33.5c-1 0-2-1-2-2v-37.3c0-1 1-2 2-2H466c1 0 2 1 2 2v37.3zm0 85.5c0 1.2-1 2-2 2h-33.5c-1 0-2-.8-2-2v-37c0-1.2 1-2 2-2H466c1 0 2 .8 2 2v37zm0 85.7c0 1-1 2-2 2h-33.5c-1 0-2-1-2-2v-37.3c0-1 1-2 2-2H466c1 0 2 1 2 2v37.3zm-65.7-342.2c0 1-1 2-2 2H367c-1 0-2-1-2-2V70.2c0-1 1-2 2-2h33.4c1 0 2 1 2 2v37.3zm0 85.5c0 1-1 2-2 2H367c-1 0-2-1-2-2v-37.2c0-1 1-2 2-2h33.4c1 0 2 1 2 2V193zm0 85.6c0 1-1 2-2 2H367c-1 0-2-1-2-2v-37.3c0-1 1-2 2-2h33.4c1 0 2 1 2 2v37.3zm0 85.5c0 1.2-1 2-2 2H367c-1 0-2-.8-2-2v-37c0-1.2 1-2 2-2h33.4c1 0 2 .8 2 2v37zm0 85.7c0 1-1 2-2 2H367c-1 0-2-1-2-2v-37.3c0-1 1-2 2-2h33.4c1 0 2 1 2 2v37.3zM489 .4H343.3c-2 0-3.6 1.6-3.6 3.6v499c0 2 1.6 3.5 3.6 3.5h146c2 0 3.5-1.6 3.5-3.6V4c0-2-1.6-3.6-3.6-3.6zM839.4 335c0 1.6-1.3 3-3 3H686.2c-1.6 0-3-1.4-3-3v-30c0-1.8 1.4-3 3-3h150.2c1.7 0 3 1.2 3 3v30M649 247c0 2-1.7 3.7-3.7 3.7h-43.5c-2 0-3.6-1.6-3.6-3.6v-27c0-2 1.6-3.7 3.6-3.7h43.5c2 0 3.6 1.6 3.6 3.6v27zm0 50.4c0 2-1.7 3.6-3.7 3.6h-43.5c-2 0-3.6-1.6-3.6-3.6v-27.2c0-2 1.6-3.6 3.6-3.6h43.5c2 0 3.6 1.6 3.6 3.6v27.2zm0 50.4c0 2-1.7 3.5-3.7 3.5h-43.5c-2 0-3.6-1.6-3.6-3.5v-27.3c0-2 1.6-3.6 3.6-3.6h43.5c2 0 3.6 1.5 3.6 3.5v27.3zm0 50.3c0 2-1.7 3.6-3.7 3.6h-43.5c-2 0-3.6-1.6-3.6-3.5V371c0-2 1.6-3.5 3.6-3.5h43.5c2 0 3.6 1.5 3.6 3.5V398zm0 50.4c0 2-1.7 3.6-3.7 3.6h-43.5c-2 0-3.6-1.6-3.6-3.6v-27.2c0-2 1.6-3.6 3.6-3.6h43.5c2 0 3.6 1.6 3.6 3.6v27.2zm-66.5-211v60c0 2-1.6 3.6-3.6 3.6h-43.6c-2 0-3.6-1.6-3.6-3.5V290c0-.6 0-1 .3-1.4l.3-.4c0-.2.2-.4.3-.5 0-.2.3-.4.4-.6 5.6-7.8 30.7-38.8 41.2-51.7l1-1.3c1-1 2-1.5 3.3-1.5 2 0 3.6 1.5 4 3.4v1.5zm0 110.4c0 2-1.7 3.5-3.7 3.5h-43.5c-2 0-3.6-1.6-3.6-3.5v-27.3c0-2 1.6-3.6 3.6-3.6h43.5c2 0 3.6 1.5 3.6 3.5v27.3zm0 50.3c0 2-1.7 3.6-3.7 3.6h-43.5c-2 0-3.6-1.6-3.6-3.5V371c0-2 1.6-3.5 3.6-3.5h43.5c2 0 3.6 1.5 3.6 3.5V398zm0 50.4c0 2-1.7 3.6-3.7 3.6h-43.5c-2 0-3.6-1.6-3.6-3.6v-27.2c0-2 1.6-3.6 3.6-3.6h43.5c2 0 3.6 1.6 3.6 3.6v27.2zm22.6-255l1-1.2c10-12.6 26.5-33 34.5-42.8l1-1.3c.8-.8 2-1.4 3.3-1.4 2 0 3.6 1.4 4 3.3v46c0 2.2-1.8 4-4 4h-.2-36-.2-.2c-2.2 0-4-1.8-4-4 0-1 .4-1.8 1-2.5zm60.5-98.7c-.5-1.7-2-2.8-3.7-2.8-.8 0-1.5.2-2 .6h-.4l-1.2 1.7-143.5 182-.6 1c-.7.6-1 1.6-1.2 2.7v223.7c0 2 1.6 3.5 3.6 3.5h146c1.8 0 3.4-1.6 3.4-3.5V96c0-.4 0-1-.3-1.3z"></path></g></svg>`,
        17: `<svg viewBox="0 0 1000 486"><g fill="currentColor" fill-rule="evenodd"><path d="M588.7 225.7c25.7-23.8 41.8-57.8 41.8-95.5 0-5.6-.4-11-1-16.6 52 5.6 92.8 49.8 92.8 103.4 0 30.5-13.2 57.8-34.2 77-19.5-37-56.2-63-99.3-68.3M677.2 355c0 57.3-46.7 104-104 104-18.7 0-36.2-5-51.4-13.7 22.2-23.3 35.8-54.8 35.8-89.5 0-8.5-.8-16.8-2.4-25 18.7 10.5 40.2 16.4 63 16.4 20.4 0 39.7-4.7 57-13 1.2 6.7 2 13.7 2 20.8m-354 .8c0-7.4 1-14.6 2.4-21.5 17.2 8.3 36.4 13 56.6 13 23 0 44.3-6 63-16.3-1.5 7.8-2.3 15.8-2.3 24 0 35 14 67 36.7 90.6-15.4 9-33.2 14.2-52.3 14.2-57.4 0-104-46.6-104-104M278 217c0-53.6 40.8-97.8 93-103.4-.8 5.5-1.2 11-1.2 16.6 0 38 16.4 72.4 42.6 96.3-43.3 5-80 31-100 67.6-21-19-34.4-46.4-34.4-77m222-190.8c42.7 0 79.3 25.8 95.4 62.6-42.3 7.4-77.6 35.4-95.4 73.2-17.6-37.8-53-65.8-95.3-73.2C421 52 457.5 26.2 500 26.2M525 262.8c14.4-7.5 30.8-12 48-12 41 0 76.4 24 93.4 58.3-14.4 7.7-30.8 12-48 12-41 0-76.4-23.8-93.4-58.2m-50 .7c-17 34-52 57.5-92.8 57.5-17.2 0-33.4-4.3-47.7-11.7 17-34 52.2-57.5 93-57.5 17 0 33.3 4.3 47.6 11.7m-77.4-149.3c50 7.5 88.7 50.7 88.7 102.8 0 5.5-.6 10.8-1.4 16-50.2-7.5-88.8-50.6-88.8-102.8 0-5.4.6-10.7 1.4-16m103 315.3c-19.3-19-31.5-45.3-31.5-74.5 0-28.8 12-55 30.8-73.7 19.4 19 31.6 45.3 31.6 74.5 0 28.8-11.7 54.8-30.7 73.7m103.6-299.3c0 52.2-38.6 95.3-88.7 102.8-.8-5.2-1.4-10.5-1.4-16 0-52 38.6-95.3 88.7-102.7.7 5.2 1.3 10.5 1.3 16M748.5 217c0-70.2-56-127.6-125.5-130-18-50.7-66-87-122.8-87-56.6 0-104.8 36.3-122.8 87C307.8 89.3 252 146.7 252 217c0 41.7 19.7 78.8 50.3 102.7-3.4 11.5-5.2 23.6-5.2 36 0 72 58.5 130.3 130.4 130.3 27.2 0 52.5-8.4 73.5-22.8 20.6 14 45.4 22 72 22 72 0 130.4-58.4 130.4-130.2 0-12.3-1.8-24.2-5-35.5 30.5-23.8 50-61 50-102.5"></path></g></svg>`
    };
    const raw = svgs[id] || svgs[17];
    return oldSdgSvgMarkup(raw, safeColor);
  }

  function oldSdgSvgMarkup(markup, color) {
    const raw = String(markup || '').trim();
    if (!/^<svg[\s>]/i.test(raw)) return '';
    const safeColor = esc(color || '#5f7f62');
    const cleaned = raw
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '');
    const marked = cleaned.replace(/<(path|circle|ellipse|rect|polygon|polyline|line)\b([^>]*?)(\/?)>/gi, (match, tag, attrs, slash) => {
      let nextAttrs = attrs || '';
      if (/\bclass\s*=\s*(['"])/i.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(/\bclass\s*=\s*(['"])(.*?)\1/i, (m, quote, value) => {
          const classes = String(value || '').split(/\s+/).filter(Boolean);
          if (!classes.includes('sdg-icon-path')) classes.unshift('sdg-icon-path');
          return `class=${quote}${classes.join(' ')}${quote}`;
        });
      } else {
        nextAttrs += ' class="sdg-icon-path"';
      }
      return `<${tag}${nextAttrs}${slash}>`;
    });
    return marked.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
      let nextAttrs = attrs || '';
      if (/\bclass\s*=\s*(['"])/i.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(/\bclass\s*=\s*(['"])(.*?)\1/i, (m, quote, value) => `class=${quote}sdg-icon ${value}${quote}`);
      } else {
        nextAttrs += ' class="sdg-icon"';
      }
      if (!/\bstyle\s*=\s*(['"])/i.test(nextAttrs)) nextAttrs += ` style="color:${safeColor}"`;
      if (!/\baria-hidden\s*=/i.test(nextAttrs)) nextAttrs += ' aria-hidden="true"';
      if (!/\bfocusable\s*=/i.test(nextAttrs)) nextAttrs += ' focusable="false"';
      return `<svg${nextAttrs}>`;
    });
  }

  function sdgLegacySvg(item) {
    const data = item || {};
    const color = data.color || '#5f7f62';
    const directSvg = oldSdgSvgMarkup(data.svg || data.iconSvg || data.svgMarkup || data.legacySvg || data.oldSvg || data.sdgSvg, color);
    if (directSvg) return directSvg;
    const image = data.svgPath || data.iconPath || data.icon || data.image || data.img;
    if (image && /\.svg(?:[?#].*)?$/i.test(String(image))) {
      return `<img class="sdg-legacy-img" src="${esc(image)}" alt="" aria-hidden="true" loading="lazy">`;
    }
    return sdgIconSvg(data.id, color);
  }
  const hero = site.hero || {};
  const slides = Array.isArray(hero.slides) ? hero.slides : [];
  const serviceItems = Array.isArray(services.items) ? services.items : [];
  const posts = Array.isArray(blog.posts) ? blog.posts.slice(0, 4) : [];
  const featuredProviders = Object.values(providers).filter(p => p && p.featuredOnIndex).slice(0, 4);
  const sdgs = Array.isArray(site.sdgs) ? site.sdgs : [];
  const sdgDisplayOrder = [4, 10, 11, 17];
  const orderedSdgs = [...sdgs].sort((a, b) => {
    const ai = sdgDisplayOrder.indexOf(Number(a && a.id));
    const bi = sdgDisplayOrder.indexOf(Number(b && b.id));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  const model = Array.isArray(about.model) ? about.model : [];
  const achievements = Array.isArray(about.achievements) ? about.achievements : [];
  const heroInfo = String(hero.info || '')
    .split(/<br\s*\/?>/i)
    .map(strip)
    .map(x => x.trim())
    .filter(Boolean);

  root.innerHTML = `
    <section class="container-wide home-hero">
      <div class="home-hero__waves" aria-hidden="true">
        <svg viewBox="0 0 1200 600" preserveAspectRatio="none">
          <path class="hero-wave wave-1" d="M-100,200 C200,100 400,450 700,250 C1000,50 1100,450 1300,300" />
          <path class="hero-wave wave-2" d="M-50,350 C150,200 450,150 750,400 C1050,650 1150,200 1350,250" />
        </svg>
      </div>
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
      <div class="home-hero__media-container">
        <div class="home-hero__media" id="home-hero-media">
          ${slides.map((s, i) => `<img class="${i === 0 ? 'active' : ''}" src="${esc(s.img)}" alt="${esc(s.alt || '活動照片')}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>`).join('')}
          <div class="home-hero__dots">${slides.map((_, i) => `<button type="button" class="${i === 0 ? 'active' : ''}" data-slide="${i}" aria-label="切換照片 ${i + 1}"></button>`).join('')}</div>
        </div>
        <svg class="home-hero__border-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path class="hero-border-outer" vector-effect="non-scaling-stroke" d="M 4,4 C 30,2, 70,2, 96,4 C 98,30, 98,70, 96,96 C 70,98, 30,98, 4,96 C 2,70, 2,30, 4,4 Z" />
          <path class="hero-border-inner" vector-effect="non-scaling-stroke" d="M 6,6 C 30,4, 70,4, 94,6 C 96,30, 96,70, 94,94 C 70,96, 30,96, 6,94 C 4,70, 4,30, 6,6 Z" />
        </svg>
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
          ${drawSvg('About us')}
        </div>

        ${sdgs.length ? `<section class="home-subsection home-sdgs goal-handdraw-section" id="sdgs">
          <div class="home-subsection__intro">
            <div>
              <span class="section-label">sdgs</span>
              <h2>符合聯合國永續發展目標</h2>
            </div>
          </div>
          <div class="sdg-grid">
            ${orderedSdgs.map((item, i) => `<a class="sdg-card sdg-card-${esc(item.id || i)}" href="${esc(item.link || '#')}" target="_blank" rel="noopener" style="--sdg-color:${esc(item.color || '#5f7f62')}">
              <div class="sdg-svg-wrapper">
                ${sdgLegacySvg(item)}
              </div>
              <div class="sdg-num">SDG ${esc(item.id || '')}</div>
              <h3 class="sdg-name">${esc(item.title)}</h3>
              <p class="sdg-desc">${esc(item.desc || '')}</p>
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

  prepareStrokeDrawings(root);
  prepareSdgCards(root);
  bootSdgIconAnimations(root);

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

  const revealTargets = root.querySelectorAll('.draw-svg, .achievement-item, .model-row, .sdg-card');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        if (entry.target.classList.contains('sdg-card')) {
          playSdgOnce(entry.target);
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
      if (el.classList.contains('sdg-card')) {
        playSdgOnce(el);
      }
    });
  }
})();





