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
    const card = el('div', 'bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl');
    const inner = el('div', 'p-6');

    const title = el('h3', 'text-xl font-bold mb-2');
    title.textContent = p.name;
    inner.appendChild(title);

    const cat = el('p', 'text-gray-500 dark:text-gray-200 mb-1');
    cat.textContent = p.category;
    inner.appendChild(cat);

    const sched = el('p', 'text-gray-500 dark:text-gray-200 mb-1');
    sched.textContent = `時間：${p.schedule || '-'}`;
    inner.appendChild(sched);

    const loc = el('p', 'text-gray-500 dark:text-gray-200 mb-4');
    loc.textContent = `地點：${p.location || '-'}`;
    inner.appendChild(loc);

    const desc = el('p', 'text-gray-700 dark:text-gray-300 mb-4');
    desc.textContent = p.description || '';
    inner.appendChild(desc);

    const link = el('a', 'link-cta small');
    link.href = `./provider.html?id=${encodeURIComponent(p.id)}`;
    link.innerHTML = '查看詳情 <span class="arrow">→</span>';
    inner.appendChild(link);

    card.appendChild(inner);
    return card;
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
            try { (function(){
              const all = Object.values(window.providersData || {});
              // minimal rebuild similar to render()
              grid.setAttribute('aria-busy','true');
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
                  const card = document.createElement('div');
                  card.className = 'bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl';
                  const inner = document.createElement('div');
                  inner.className = 'p-6';
                  inner.innerHTML = `
                    <h3 class="text-xl font-bold mb-2">${p.name}</h3>
                    <p class="text-gray-500 dark:text-gray-200 mb-1">${p.category}</p>
                    <p class="text-gray-500 dark:text-gray-200 mb-1">時間：${p.schedule || '-'}</p>
                    <p class="text-gray-500 dark:text-gray-200 mb-4">地點：${p.location || '-'}</p>
                    <p class="text-gray-700 dark:text-gray-300 mb-4">${p.description || ''}</p>
                    <a class="link-cta small" href="./provider.html?id=${encodeURIComponent(p.id)}">查看詳情 <span class="arrow">→</span></a>
                  `;
                  card.appendChild(inner);
                  grid.appendChild(card);
                });
              }
              grid.setAttribute('aria-busy','false');
            })(); } catch (e) {}
          });
        }
      }
    });
  } catch (e) {}
})();
