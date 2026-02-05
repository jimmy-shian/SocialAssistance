// Explore page dynamic rendering and filtering
(function () {
  function qs(sel, root = document) { return root.querySelector(sel); }
  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

  const grid = qs('#providers-grid');
  const searchInput = qs('#search-input');
  const categorySelect = qs('#category-select'); // hidden input storing current value
  const catBtn = qs('#category-button');
  const catMenu = qs('#category-menu');
  const catLabel = qs('#category-button-label');
  const searchBtn = qs('#search-btn');

  const dataset = () => (window.providersData || {});

  function providerCard(p) {
    const wrapper = el('div', 'holo-card-container');
    const card = el('div', 'holo-card card-dynamic-bg p-6 rounded-xl transition-all duration-300'); // Removed hover:shadow-lg

    // Layers
    card.appendChild(el('div', 'holo-layer'));
    card.appendChild(el('div', 'border-layer'));
    const content = el('div', 'card-content-layer');
    card.appendChild(content);

    const title = el('h3', 'text-xl font-bold mb-2 text-[var(--primary)]');
    title.textContent = p.name;
    content.appendChild(title);

    const cat = el('span', 'inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded mb-3 text-gray-600 dark:text-gray-300');
    cat.textContent = p.category;
    content.appendChild(cat);
    content.appendChild(el('div', 'mb-2')); // Spacer

    const paramRow = (label, val) => {
      const pEl = el('p', 'text-sm text-gray-500 dark:text-gray-400 mb-1');
      pEl.textContent = `${label}：${val || '-'}`;
      return pEl;
    };

    content.appendChild(paramRow('時間', p.schedule));
    content.appendChild(paramRow('地點', p.location));

    const desc = el('p', 'text-gray-700 dark:text-gray-300 mt-4 mb-4 leading-relaxed line-clamp-3');
    desc.textContent = p.description || '';
    content.appendChild(desc);

    const link = el('a', 'link-soft text-sm font-medium');
    link.href = `./provider.html?id=${encodeURIComponent(p.id)}`;
    link.innerHTML = '查看詳情';
    content.appendChild(link);

    wrapper.appendChild(card);
    return wrapper;
  }

  function filterList(list, keyword, category) {
    const kw = (keyword || '').trim().toLowerCase();
    const cat = (category || '').trim();
    return list.filter(p => {
      const kwok = !kw || (p.name + ' ' + (p.description || '')).toLowerCase().includes(kw);
      const catok = !cat || cat === '所有產業' || p.category === cat;
      return kwok && catok;
    });
  }

  function render() {
    if (!grid) return;
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = '';
    // 確保每個 provider 皆有 id（若缺則以鍵名補上）
    const all = Object.entries(dataset()).map(([k, p]) => ({ ...p, id: p && p.id ? p.id : k }));
    const filtered = filterList(all, searchInput && searchInput.value, categorySelect && categorySelect.value);
    if (!filtered.length) {
      const empty = el('div', 'text-center text-gray-500 col-span-full');
      empty.textContent = '未找到符合條件的課程';
      grid.appendChild(empty);
    } else {
      for (const p of filtered) {
        grid.appendChild(providerCard(p));
      }
    }
    grid.setAttribute('aria-busy', 'false');
  }

  function init() {
    if (searchBtn) searchBtn.addEventListener('click', render);
    if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') render(); });
    // live filtering while typing with debounce
    if (searchInput) {
      let t;
      searchInput.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(render, 150);
      });
    }
    if (categorySelect) categorySelect.addEventListener('change', render);

    // Custom dropdown
    function openMenu() {
      if (!catMenu || !catBtn) return;
      catMenu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
      catMenu.classList.add('opacity-100', 'scale-100');
      catBtn.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
      if (!catMenu || !catBtn) return;
      catMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
      catMenu.classList.remove('opacity-100', 'scale-100');
      catBtn.setAttribute('aria-expanded', 'false');
    }
    if (catBtn) {
      catBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expanded = catBtn.getAttribute('aria-expanded') === 'true';
        expanded ? closeMenu() : openMenu();
      });
    }
    if (catMenu) {
      catMenu.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-value]');
        if (!btn) return;
        const val = btn.getAttribute('data-value');
        if (categorySelect) categorySelect.value = val;
        if (catLabel) catLabel.textContent = val;
        render();
        closeMenu();
      });
    }
    document.addEventListener('click', (e) => {
      if (!catMenu || !catBtn) return;
      if (!catMenu.contains(e.target) && !catBtn.contains(e.target)) {
        closeMenu();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-render when providers dataset updated from GAS
  try {
    const EVT = (window.DataAPI && window.DataAPI.EVENT) || 'data:updated';
    document.addEventListener(EVT, (ev) => {
      const ds = (window.AppConfig && window.AppConfig.datasets && window.AppConfig.datasets.providers) || 'providers';
      const keys = (ev && ev.detail && ev.detail.keys) || [];
      if (!keys.length || keys.includes(ds)) {
        // re-render to reflect latest providers
        const grid = document.getElementById('providers-grid');
        if (grid) {
          // call local render by triggering a microtask
          Promise.resolve().then(() => {
            // reuse local render via dispatching input change or direct call
            try {
              (function () {
                const all = Object.values(window.providersData || {});
                // minimal rebuild similar to render()
                grid.setAttribute('aria-busy', 'true');
                grid.innerHTML = '';
                const searchInput = document.getElementById('search-input');
                const categorySelect = document.getElementById('category-select');
                const kw = (searchInput && searchInput.value) || '';
                const cat = (categorySelect && categorySelect.value) || '';
                const filtered = all.filter(p => {
                  const kwok = !kw || (p.name + ' ' + (p.description || '')).toLowerCase().includes(kw.toLowerCase());
                  const catok = !cat || cat === '所有產業' || p.category === cat;
                  return kwok && catok;
                });
                if (!filtered.length) {
                  const empty = document.createElement('div');
                  empty.className = 'text-center text-gray-500 col-span-full';
                  empty.textContent = '未找到符合條件的課程';
                  grid.appendChild(empty);
                } else {
                  filtered.forEach(p => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'holo-card-container';
                    wrapper.innerHTML = `
                      <div class="holo-card card-dynamic-bg p-6 rounded-xl transition-all duration-300">
                        <div class="holo-layer"></div>
                        <div class="border-layer"></div>
                        <div class="card-content-layer">
                            <h3 class="text-xl font-bold mb-2 text-[var(--primary)]">${p.name}</h3>
                            <span class="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded mb-3 text-gray-600 dark:text-gray-300">${p.category}</span>
                            <div class="mb-2"></div>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">時間：${p.schedule || '-'}</p>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">地點：${p.location || '-'}</p>
                            <p class="text-gray-700 dark:text-gray-300 mt-4 mb-4 leading-relaxed line-clamp-3">${p.description || ''}</p>
                            <a class="link-soft text-sm font-medium" href="./provider.html?id=${encodeURIComponent(p.id)}">查看詳情</a>
                        </div>
                      </div>
                    `;
                    grid.appendChild(wrapper);
                  });
                }
                grid.setAttribute('aria-busy', 'false');
              })();
            } catch (e) { }
          });
        }
      }
    });
  } catch (e) { }
})();
