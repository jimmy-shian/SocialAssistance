(function () {
  const root = document.getElementById('about-root');
  const data = window.aboutContent || {};
  if (!root) return;
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function rowText(item) { return typeof item === 'string' ? { text: item, href: '' } : { text: item && (item.text || item.title) || '', href: item && item.href || '' }; }
  function parseNumber(text) {
    const match = String(text || '').match(/(\d+)/);
    if (!match) return { num: '', prefix: '', suffix: text || '' };
    return { num: match[1], prefix: text.slice(0, match.index), suffix: text.slice(match.index + match[1].length) };
  }

  function parseTimelineTime(value) {
    const text = String(value || '');
    const year = Number((text.match(/(\d{2,3})\s*年/) || [0, 0])[1]);
    const month = Number((text.match(/年\s*(\d{1,2})\s*月/) || [0, 0])[1]);
    const fullYear = year > 1911 ? year : year + 1911;
    return fullYear * 100 + month;
  }

  const team = Array.isArray(data.team) ? data.team : [];
  const achievements = Array.isArray(data.achievements) ? data.achievements : [];

  const gloryTimeline = (function() {
    const posts = (window.blogContent && Array.isArray(window.blogContent.posts)) ? window.blogContent.posts : [];
    const gloryPost = posts.find(p => p.category === 'glory');
    if (!gloryPost || !Array.isArray(gloryPost.timeline)) return [];
    const timeline = gloryPost.timeline.slice();
    timeline.sort((a, b) => parseTimelineTime(b.time) - parseTimelineTime(a.time));
    return timeline;
  })();

  root.innerHTML = `
    <section class="container page-hero">
      <span class="page-hero__label">about</span>
      <h1>${esc(data.heroTitle || '關於我們')}</h1>
      <p class="page-hero__lead">${esc(data.lead || '')}</p>
    </section>

    <section class="section section-soft" id="team">
      <div class="container">
        <span class="section-label">team</span>
        <h2>陪伴孩子走一段路的人</h2>
        <div class="team-list" style="margin-top:30px">
          ${team.map(t => `
            <article class="team-row">
              <div class="image-frame">${t.photo ? `<img src="${esc(t.photo)}" alt="${esc(t.name)}" loading="lazy">` : ''}</div>
              <div class="stack-sm">
                <div class="chip-list">${(t.roles || []).map(role => `<span class="category-pill">${esc(role)}</span>`).join('')}</div>
                <h3>${esc(t.name)}</h3>
                ${t.motto ? `<p><strong>${esc(t.motto)}</strong></p>` : ''}
                ${(t.education || []).length ? `<div><strong class="text-primary">學歷</strong><ul>${t.education.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
                ${(t.experience || []).length ? `<div><strong class="text-primary">經歷</strong><ul>${t.experience.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
              </div>
            </article>`).join('')}
        </div>
      </div>
    </section>

    <section class="section section-soft">
      <div class="container">
        <span class="section-label">model</span>
        <h2>四階段動機引導模型</h2>
        <div class="model-list compact-model-list" style="margin-top:24px">
          ${(data.model || []).map((m, i) => `
            <article class="model-row interactive-line">
              <div class="model-row__num">${String(i + 1).padStart(2, '0')}</div>
              <div><h3>${esc(m.title)}</h3><p>${esc(m.desc || '')}</p></div>
            </article>`).join('')}
        </div>
      </div>
    </section>

    ${gloryTimeline.length ? `
    <section class="section">
      <div class="container">
        <span class="section-label">glory</span>
        <h2>榮耀時刻</h2>
        <div class="glory-vertical-timeline" style="margin-top:24px">
          ${gloryTimeline.map((item, idx) => `
            <div class="glory-timeline-item" style="--item-index: ${idx}">
              <div class="glory-timeline-badge-wrapper">
                <div class="glory-timeline-badge"></div>
              </div>
              <div class="glory-timeline-content">
                <div class="glory-timeline-time">${esc(item.time)}</div>
                <h3 class="glory-timeline-title">${esc(item.title)}</h3>
                <p class="glory-timeline-detail">${esc(item.detail)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>` : ''}

    ${achievements.length ? `
    <section class="section section-soft">
      <div class="container">
        <span class="section-label">records</span>
        <h2>${esc(data.achievementsTitle || '歷年服務')}</h2>
        <div class="achievement-strip" style="margin-top:24px">
          ${achievements.map((item, i) => {
            const row = rowText(item);
            const parsed = parseNumber(row.text);
            const body = `<span class="achievement-number" data-to="${esc(parsed.num)}">${esc(parsed.num || '•')}</span><p>${esc(parsed.prefix)}${parsed.num ? `<strong>${esc(parsed.num)}</strong>` : ''}${esc(parsed.suffix)}</p>`;
            return row.href ? `<a class="achievement-item interactive-lift" href="${esc(row.href)}">${body}</a>` : `<div class="achievement-item interactive-lift">${body}</div>`;
          }).join('')}
        </div>
      </div>
    </section>` : ''}`;

  const revealTargets = root.querySelectorAll('.achievement-item, .model-row, .glory-timeline-item');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        if (entry.target.classList.contains('glory-timeline-item')) {
          entry.target.classList.add('revealed');
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
      if (el.classList.contains('glory-timeline-item')) {
        el.classList.add('revealed');
      }
    });
  }
})();
