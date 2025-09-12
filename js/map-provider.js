// Map for provider page: render a leaflet map centered on provider coords
(function () {
  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function deriveRegionName(loc) {
    if (!loc || typeof loc !== 'string') return '';
    // Assume the first token contains 縣/市 like "嘉義縣" or "嘉義市"
    const token = loc.trim().split(/\s+/)[0];
    return token || '';
  }

  function installWheelGuard(map, container) {
    if (!container) return;
    const hint = document.createElement('div');
    hint.className = 'map-zoom-hint';
    hint.textContent = '點擊地圖以啟用滾輪縮放';
    container.appendChild(hint);

    let enabled = false;
    const enable = () => {
      if (enabled) return;
      map.scrollWheelZoom.enable();
      enabled = true;
      hint.textContent = '滾輪縮放啟用中（按 ESC 或滑出地圖關閉）';
    };
    const disable = () => {
      if (!enabled) return;
      map.scrollWheelZoom.disable();
      enabled = false;
      hint.textContent = '點擊地圖以啟用滾輪縮放';
    };

    container.addEventListener('click', enable);
    container.addEventListener('mouseleave', disable);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') disable(); });

    disable();
  }

  function init() {
    const mapEl = document.getElementById('provider-map');
    if (!mapEl) return;
    const id = getParam('id');
    const data = window.providersData || {};
    const p = data[id];
    if (!p || !p.coords) return;

    const center = [p.coords.lat, p.coords.lng];
    // Bounds presets: county/city and fallback
    const REGION_BOUNDS = {
      '嘉義縣': L.latLngBounds([23.20, 120.10], [23.65, 120.70]),
      '嘉義市': L.latLngBounds([23.45, 120.39], [23.52, 120.48])
    };
    const DEFAULT_BOUNDS = L.latLngBounds([23.25, 120.2], [23.7, 120.7]);
    const regionName = deriveRegionName(p.location);
    const countyBounds = REGION_BOUNDS[regionName] || DEFAULT_BOUNDS;

    // Site-level small bounds around the activity site
    function makeSiteBounds(lat, lng, delta = 0.02) {
      return L.latLngBounds([lat - delta, lng - delta], [lat + delta, lng + delta]);
    }

    const map = L.map('provider-map', {
      center,
      zoom: 13,
      maxBounds: countyBounds,
      maxBoundsViscosity: 0.5,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker(center).addTo(map);
    marker.bindPopup(`<strong>${p.name}</strong><br>${p.address || ''}`);

    // Lock controls (county/site/none)
    const btnCounty = document.getElementById('lock-county');
    const btnSite = document.getElementById('lock-site');
    const btnNone = document.getElementById('lock-none');
    const label = document.getElementById('lock-label');

    let currentLock = 'county'; // 'county' | 'site' | 'none'

    function setPressed(btn, pressed) {
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(pressed));
      btn.classList.toggle('ring-2', pressed);
      btn.classList.toggle('ring-blue-500', pressed);
    }

    function applyLock() {
      // reset aria-pressed
      setPressed(btnCounty, currentLock === 'county');
      setPressed(btnSite, currentLock === 'site');
      setPressed(btnNone, currentLock === 'none');

      if (currentLock === 'county') {
        map.setMaxBounds(countyBounds);
        map.fitBounds(countyBounds);
        if (label) label.textContent = `鎖定：${regionName || '縣市'}`;
      } else if (currentLock === 'site') {
        const siteBounds = makeSiteBounds(center[0], center[1]);
        map.setMaxBounds(siteBounds);
        map.fitBounds(siteBounds);
        if (label) label.textContent = '鎖定：活動場域';
      } else {
        // none: unlock
        map.setMaxBounds(null);
        map.setView(center, 13);
        if (label) label.textContent = '鎖定：自由';
      }
    }

    if (btnCounty) btnCounty.addEventListener('click', () => { currentLock = 'county'; applyLock(); });
    if (btnSite) btnSite.addEventListener('click', () => { currentLock = 'site'; applyLock(); });
    if (btnNone) btnNone.addEventListener('click', () => { currentLock = 'none'; applyLock(); });

    // Default to county lock as requested
    applyLock();

    // Wheel zoom guard
    installWheelGuard(map, mapEl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
