(function () {
  const root = document.getElementById('about-root');
  const data = window.aboutContent || {};
  if (!root) return;
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  const team = Array.isArray(data.team) ? data.team : [];
  const achievements = Array.isArray(data.achievements) ? data.achievements : [];
  root.innerHTML = `
    <section class="container page-hero">
      <span class="page-hero__label">about</span>
      <h1>${esc(data.heroTitle || '關於我們')}</h1>
      <p class="page-hero__lead">${esc(data.lead || '')}</p>
    </section>
    <section class="section section-soft">
      <div class="container">
        <span class="section-label">model</span>
        <h2>四階段引導模型</h2>
        <div class="model-list" style="margin-top:24px">
          ${(data.model || []).map((m, i) => `
            <article class="model-row">
              <div class="model-row__num">${String(i + 1).padStart(2, '0')}</div>
              <div><h3>${esc(m.title)}</h3><p>${esc(m.desc || '')}</p></div>
            </article>`).join('')}
        </div>
      </div>
    </section>
    ${achievements.length ? `<section class="section"><div class="container"><span class="section-label">records</span><h2>${esc(data.achievementsTitle || '成就經歷')}</h2><div class="stat-strip" style="margin-top:24px">${achievements.map(a => `<div><strong class="text-primary">${esc(typeof a === 'string' ? a : a.text)}</strong></div>`).join('')}</div></div></section>` : ''}
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
    </section>`;
})();
