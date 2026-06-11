// Explore page dynamic rendering and filtering with horizontal layout and chips
(function () {
  function qs(sel, root = document) { return root.querySelector(sel); }
  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

  const grid = qs('#providers-grid');
  const searchInput = qs('#search-input');
  const categorySelect = qs('#category-select'); // hidden input storing current value
  const searchBtn = qs('#search-btn');
  const showMoreBtn = qs('#show-more-btn');
  const showMoreContainer = qs('#show-more-container');

  const dataset = () => (window.providersData || {});
  let itemsToShow = 6;

  function providerCard(p) {
    const item = el('div', 'provider-list-item');

    // Left container: Title + Category tag
    const leftCol = el('div', 'provider-list-left');
    const h3 = el('h3');
    h3.textContent = p.name;
    const tag = el('span', 'provider-category-tag');
    tag.textContent = p.category;
    h3.appendChild(tag);
    leftCol.appendChild(h3);
    item.appendChild(leftCol);

    // Right container: Location + Description + Link
    const rightCol = el('div', 'provider-list-right');
    
    // Location (with SVG pin)
    const loc = el('div', 'provider-location mb-2');
    loc.innerHTML = `
      <svg class="w-4 h-4 text-[var(--primary)] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      <span>${p.location || ''}</span>
    `;
    rightCol.appendChild(loc);

    const desc = el('p', 'provider-description');
    desc.textContent = p.description || '';
    rightCol.appendChild(desc);

    const link = el('a', 'provider-link');
    link.href = `./provider.html?id=${encodeURIComponent(p.id)}`;
    link.innerHTML = `查看詳情 <span class="arrow">→</span>`;
    rightCol.appendChild(link);
    item.appendChild(rightCol);

    return item;
  }

  function filterList(list, keyword, category) {
    const kw = (keyword || '').trim().toLowerCase();
    const cat = (category || '').trim();
    return list.filter(p => {
      const kwok = !kw || (p.name + ' ' + (p.description || '')).toLowerCase().includes(kw);
      const catok = !cat || cat === '所有產業' || p.category === cat ||
                    (cat === '農林漁牧業' && (p.category === '農業' || p.category === '農林漁牧業'));
      return kwok && catok;
    });
  }

  function render() {
    if (!grid) return;
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = '';
    
    // Ensure each provider has an ID
    const all = Object.entries(dataset()).map(([k, p]) => ({ ...p, id: p && p.id ? p.id : k }));
    const filtered = filterList(all, searchInput && searchInput.value, categorySelect && categorySelect.value);
    
    if (!filtered.length) {
      const empty = el('div', 'text-center text-gray-500 col-span-full py-8');
      empty.textContent = '未找到符合條件的課程';
      grid.appendChild(empty);
      if (showMoreContainer) showMoreContainer.style.display = 'none';
    } else {
      const visibleItems = filtered.slice(0, itemsToShow);
      for (const p of visibleItems) {
        grid.appendChild(providerCard(p));
      }
      
      if (showMoreContainer) {
        showMoreContainer.style.display = filtered.length > itemsToShow ? 'flex' : 'none';
      }
    }
    grid.setAttribute('aria-busy', 'false');
  }

  function init() {
    if (searchBtn) searchBtn.addEventListener('click', () => { itemsToShow = 6; render(); });
    if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { itemsToShow = 6; render(); } });
    
    // live filtering while typing with debounce
    if (searchInput) {
      let t;
      searchInput.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          itemsToShow = 6;
          render();
        }, 150);
      });
    }

    // Chips filtering
    const chipsContainer = qs('#category-chips');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip');
        if (!btn) return;
        
        // Remove active class from all chips
        chipsContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');

        const val = btn.getAttribute('data-value');
        if (categorySelect) {
          categorySelect.value = val;
          categorySelect.dispatchEvent(new Event('change'));
        }
        
        itemsToShow = 6;
        render();
      });
    }

    // Show more button action
    if (showMoreBtn) {
      showMoreBtn.addEventListener('click', () => {
        itemsToShow += 6;
        render();
      });
    }

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
        render();
      }
    });
  } catch (e) { }
})();
