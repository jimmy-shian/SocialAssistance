(function () {
  const root = document.getElementById('explore-root');
  if (!root) return;
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  const all = () => Object.entries(window.providersData || {}).map(([id, p]) => ({ id, ...p, id: p.id || id }));
  const categories = () => Array.from(new Set(all().map(p => p.category).filter(Boolean)));
  const locations = () => Array.from(new Set(all().map(p => (p.location || '').split(/\s+/)[0]).filter(Boolean)));
  let state = { keyword: '', category: '', location: '', tag: '' };

  function match(p) {
    const text = [p.name, p.category, p.location, p.description, ...(p.know || []), ...(p.learn || []), ...(p.gain || [])].join(' ').toLowerCase();
    const kw = state.keyword.trim().toLowerCase();
    return (!kw || text.includes(kw)) && (!state.category || p.category === state.category) && (!state.location || (p.location || '').includes(state.location)) && (!state.tag || text.includes(state.tag.toLowerCase()));
  }

  function providerCard(p) {
    const image = (p.images && p.images[0]) || '';
    return `<article class="resource-item">
      <a class="image-frame resource-item__image" href="./provider.html?id=${encodeURIComponent(p.id)}">${image ? `<img src="${esc(image)}" alt="${esc(p.name)}" loading="lazy">` : ''}</a>
      <div>
        <div class="article-row__meta"><span class="category-pill">${esc(p.category || '探索資源')}</span><span class="date-text">${esc(p.location || '')}</span></div>
        <h3>${esc(p.name)}</h3>
        <p class="line-clamp-3">${esc(p.description || '')}</p>
        <a class="button-text" href="./provider.html?id=${encodeURIComponent(p.id)}">進入場域 →</a>
      </div>
    </article>`;
  }

  function filtersHtml() {
    const cats = categories();
    const locs = locations();
    const tags = ['自立', '職業', '親子', '冒險', '農業', '美感', '口語', '科技'];
    return `<aside class="side-panel resource-filters">
      <button class="filter-toggle" id="filter-toggle" type="button" aria-expanded="true" aria-controls="resource-filter-body">
        <span>搜尋條件</span><span aria-hidden="true">＋</span>
      </button>
      <div id="resource-filter-body" class="field-stack">
        <h2>搜尋條件</h2>
        <div class="filter-group"><label for="resource-keyword">關鍵字</label><input id="resource-keyword" type="search" placeholder="輸入場域、產業或能力" value="${esc(state.keyword)}"></div>
        <div class="filter-group"><label for="resource-category">產業類別</label><select id="resource-category"><option value="">全部類別</option>${cats.map(c => `<option value="${esc(c)}" ${state.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="filter-group"><label for="resource-location">地區</label><select id="resource-location"><option value="">全部地區</option>${locs.map(c => `<option value="${esc(c)}" ${state.location === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="filter-group"><label>服務 / 體驗標籤</label><div class="chip-list">${tags.map(t => `<button class="chip ${state.tag === t ? 'active' : ''}" type="button" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
        <button class="button-secondary" type="button" id="resource-reset">清除條件</button>
      </div>
    </aside>`;
  }

  function render() {
    const list = all().filter(match);
    root.innerHTML = `<div class="resource-layout">
      ${filtersHtml()}
      <section>
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:22px;flex-wrap:wrap">
          <div><span class="section-label">resources</span><h2 style="margin-bottom:0">${list.length} 個探索場域</h2></div>
          <p class="muted" style="margin:0">左側可篩選，右側快速比較場域照片、類別與位置。</p>
        </div>
        <div class="resource-grid">${list.length ? list.map(providerCard).join('') : '<p class="muted">沒有符合條件的場域。</p>'}</div>
      </section>
    </div>`;
    bind();
  }

  function bind() {
    const kw = document.getElementById('resource-keyword');
    const cat = document.getElementById('resource-category');
    const loc = document.getElementById('resource-location');
    let timer;
    if (kw) kw.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.keyword = kw.value; render(); }, 160); });
    if (cat) cat.addEventListener('change', () => { state.category = cat.value; render(); });
    if (loc) loc.addEventListener('change', () => { state.location = loc.value; render(); });
    document.querySelectorAll('[data-tag]').forEach(btn => btn.addEventListener('click', () => { state.tag = state.tag === btn.dataset.tag ? '' : btn.dataset.tag; render(); }));
    const reset = document.getElementById('resource-reset');
    if (reset) reset.addEventListener('click', () => { state = { keyword: '', category: '', location: '', tag: '' }; render(); });
    const panel = document.querySelector('.resource-filters');
    const toggle = document.getElementById('filter-toggle');
    if (panel && toggle) {
      const shouldCollapse = window.matchMedia && window.matchMedia('(max-width: 980px)').matches;
      panel.classList.toggle('collapsed', shouldCollapse);
      toggle.setAttribute('aria-expanded', String(!shouldCollapse));
      toggle.addEventListener('click', () => {
        const collapsed = !panel.classList.contains('collapsed');
        panel.classList.toggle('collapsed', collapsed);
        toggle.setAttribute('aria-expanded', String(!collapsed));
      });
    }
  }

  render();
})();

