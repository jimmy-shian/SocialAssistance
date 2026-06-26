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
    const isMobile = window.innerWidth <= 980;
    return `<aside class="side-panel resource-filters ${isMobile ? 'collapsed' : ''}">
      <button class="filter-toggle" id="filter-toggle" type="button" aria-expanded="${isMobile ? 'false' : 'true'}" aria-controls="resource-filter-body">
        <span>搜尋條件</span><span aria-hidden="true">+</span>
      </button>
      <div id="resource-filter-body"><div class="field-stack">
        <h2>搜尋條件</h2>
        <div class="filter-group"><label for="resource-keyword">關鍵字</label><input id="resource-keyword" type="search" placeholder="輸入場域、產業或能力" value="${esc(state.keyword)}"></div>
        <div class="filter-group">
          <label>產業類別</label>
          <div class="custom-select" id="custom-select-category" tabindex="0" role="combobox" aria-expanded="false" aria-haspopup="listbox">
            <div class="custom-select-trigger">
              <span>${esc(state.category || '全部類別')}</span>
              <span class="arrow"></span>
            </div>
            <div class="custom-select-options" role="listbox">
              <div class="custom-select-option ${!state.category ? 'selected' : ''}" data-value="" role="option" aria-selected="${!state.category}">全部類別</div>
              ${cats.map(c => `<div class="custom-select-option ${state.category === c ? 'selected' : ''}" data-value="${esc(c)}" role="option" aria-selected="${state.category === c}">${esc(c)}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="filter-group">
          <label>地區</label>
          <div class="custom-select" id="custom-select-location" tabindex="0" role="combobox" aria-expanded="false" aria-haspopup="listbox">
            <div class="custom-select-trigger">
              <span>${esc(state.location || '全部地區')}</span>
              <span class="arrow"></span>
            </div>
            <div class="custom-select-options" role="listbox">
              <div class="custom-select-option ${!state.location ? 'selected' : ''}" data-value="" role="option" aria-selected="${!state.location}">全部地區</div>
              ${locs.map(c => `<div class="custom-select-option ${state.location === c ? 'selected' : ''}" data-value="${esc(c)}" role="option" aria-selected="${state.location === c}">${esc(c)}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="filter-group"><label>服務 / 體驗標籤</label><div class="chip-list">${tags.map(t => `<button class="chip ${state.tag === t ? 'active' : ''}" type="button" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
        <button class="button-secondary" type="button" id="resource-reset">清除條件</button>
        <div id="explore-map" class="explore-map-container" style="height:240px; margin-top:20px; border-radius:var(--radius-card); border:1px solid var(--color-line); overflow:hidden; position:relative; z-index: 10;"></div>
      </div></div>
    </aside>`;
  }

  let exploreMapInstance = null;

  function initExploreMap(list) {
    if (window.innerWidth <= 980) return;
    const mapEl = document.getElementById('explore-map');
    if (!mapEl) return;

    if (exploreMapInstance) {
      try {
        exploreMapInstance.remove();
      } catch (e) {
        console.error(e);
      }
      exploreMapInstance = null;
    }

    const withCoords = list.filter(p => p && p.coords);
    if (!withCoords.length) {
      mapEl.style.display = 'none';
      return;
    } else {
      mapEl.style.display = 'block';
    }

    try {
      exploreMapInstance = L.map('explore-map', {
        center: [23.48, 120.44],
        zoom: 11,
        scrollWheelZoom: false,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(exploreMapInstance);

      const latLngs = [];
      withCoords.forEach(p => {
        const marker = L.marker([p.coords.lat, p.coords.lng]).addTo(exploreMapInstance);
        latLngs.push([p.coords.lat, p.coords.lng]);
        const href = `./provider.html?id=${encodeURIComponent(p.id)}`;
        const popupHtml = `
          <div style="cursor:pointer; text-align:center" onclick="window.location.href='${href}'">
            <strong style="font-size:13px">${esc(p.name)}</strong><br>
            <span style="font-size:11px;color:#6b7280">點擊進入場域</span>
          </div>
        `;
        marker.bindPopup(popupHtml);
        marker.on('mouseover', () => marker.openPopup());
        marker.on('click', () => { window.location.href = href; });
      });

      if (latLngs.length > 0) {
        if (latLngs.length === 1) {
          exploreMapInstance.setView(latLngs[0], 13);
        } else {
          exploreMapInstance.fitBounds(L.latLngBounds(latLngs), { padding: [15, 15] });
        }
      }
    } catch (err) {
      console.error('Leaflet initialization failed', err);
    }
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
    initExploreMap(list);
  }

  function setupCustomSelect(id, stateKey) {
    const container = document.getElementById(id);
    if (!container) return;
    const trigger = container.querySelector('.custom-select-trigger');
    const options = container.querySelectorAll('.custom-select-option');

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select').forEach(el => {
        if (el !== container) {
          el.classList.remove('active');
          el.setAttribute('aria-expanded', 'false');
        }
      });
      const isActive = container.classList.toggle('active');
      container.setAttribute('aria-expanded', String(isActive));
    });

    // Select option
    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        state[stateKey] = opt.dataset.value;
        container.classList.remove('active');
        container.setAttribute('aria-expanded', 'false');
        render();
        scrollToResults();
      });
    });

    // Keyboard navigation
    container.addEventListener('keydown', (e) => {
      const activeOptions = Array.from(options);
      let currentIndex = activeOptions.findIndex(o => o.classList.contains('selected'));
      if (currentIndex === -1) currentIndex = 0;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (container.classList.contains('active')) {
          const focusedOpt = activeOptions[currentIndex];
          if (focusedOpt) {
            state[stateKey] = focusedOpt.dataset.value;
            container.classList.remove('active');
            container.setAttribute('aria-expanded', 'false');
            render();
            scrollToResults();
          }
        } else {
          container.classList.add('active');
          container.setAttribute('aria-expanded', 'true');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        container.classList.remove('active');
        container.setAttribute('aria-expanded', 'false');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!container.classList.contains('active')) {
          container.classList.add('active');
          container.setAttribute('aria-expanded', 'true');
        } else {
          activeOptions[currentIndex].classList.remove('selected');
          currentIndex = (currentIndex + 1) % activeOptions.length;
          activeOptions[currentIndex].classList.add('selected');
          activeOptions[currentIndex].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!container.classList.contains('active')) {
          container.classList.add('active');
          container.setAttribute('aria-expanded', 'true');
        } else {
          activeOptions[currentIndex].classList.remove('selected');
          currentIndex = (currentIndex - 1 + activeOptions.length) % activeOptions.length;
          activeOptions[currentIndex].classList.add('selected');
          activeOptions[currentIndex].scrollIntoView({ block: 'nearest' });
        }
      }
    });
  }

  function bind() {
    const kw = document.getElementById('resource-keyword');
    let timer;
    if (kw) kw.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.keyword = kw.value; render(); scrollToResults(); }, 160); });
    
    // Bind custom select dropdowns
    setupCustomSelect('custom-select-category', 'category');
    setupCustomSelect('custom-select-location', 'location');

    document.querySelectorAll('[data-tag]').forEach(btn => btn.addEventListener('click', () => { state.tag = state.tag === btn.dataset.tag ? '' : btn.dataset.tag; render(); scrollToResults(); }));
    const reset = document.getElementById('resource-reset');
    if (reset) reset.addEventListener('click', () => { state = { keyword: '', category: '', location: '', tag: '' }; render(); scrollToResults(); });
    const panel = document.querySelector('.resource-filters');
    const toggle = document.getElementById('filter-toggle');
    if (panel && toggle) {
      toggle.addEventListener('click', () => {
        const collapsed = !panel.classList.contains('collapsed');
        panel.classList.toggle('collapsed', collapsed);
        toggle.setAttribute('aria-expanded', String(!collapsed));
      });
    }

    // Document click listener to close dropdowns and mobile filter panel when clicking outside
    document.addEventListener('click', (e) => {
      // Close custom select dropdowns when clicking outside
      document.querySelectorAll('.custom-select').forEach(el => {
        if (!el.contains(e.target)) {
          el.classList.remove('active');
          el.setAttribute('aria-expanded', 'false');
        }
      });

      // Close mobile filters panel when clicking outside
      if (window.innerWidth <= 980) {
        const panel = document.querySelector('.resource-filters');
        const toggle = document.getElementById('filter-toggle');
        if (panel && !panel.classList.contains('collapsed') && !panel.contains(e.target)) {
          panel.classList.add('collapsed');
          if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
          }
        }
      }
    });
  }

  function scrollToResults() {
    const target = document.querySelector('.resource-layout section') || document.querySelector('.resource-grid');
    if (!target) return;
    const header = document.querySelector('.site-header');
    const headerHeight = header ? header.offsetHeight : 74;
    const filterBar = document.querySelector('.resource-filters');
    let offset = headerHeight;
    if (window.innerWidth <= 980 && filterBar) {
      offset += filterBar.offsetHeight;
    } else {
      offset += 20;
    }
    const targetY = target.getBoundingClientRect().top + window.scrollY - offset;
    const startY = window.scrollY;
    const distance = targetY - startY;
    if (Math.abs(distance) < 5) return;
    const duration = Math.min(800, Math.max(300, Math.abs(distance) * 0.4));
    const startTime = performance.now();
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeOutCubic(progress));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  render();
})();

