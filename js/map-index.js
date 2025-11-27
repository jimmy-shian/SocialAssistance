// Initialize Leaflet map on index page and add provider markers linking to provider pages
(function () {
  let initialized = false;
  let map, taiwanBounds;
  let regions = [];
  let currentRegionIndex = 0;
  let suppressInitialFit = false;

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

    // start disabled
    disable();
  }

  function initMap() {
    if (initialized) return;
    const mapEl = document.getElementById('chiayi-map');
    if (!mapEl) return;
    initialized = true;

    // Default fallback: Chiayi city center
    const fallbackCenter = [23.48, 120.44];

    // Taiwan bounds (approx): lat 21.75–25.38, lng 119.3–122.1
    taiwanBounds = L.latLngBounds([21.75, 119.3], [25.38, 122.1]);

    map = L.map('chiayi-map', {
      center: fallbackCenter,
      zoom: 11,
      maxBounds: taiwanBounds,
      maxBoundsViscosity: 0.2, // gentle constraint
      scrollWheelZoom: false,
      updateWhenIdle: true,
      preferCanvas: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      updateWhenIdle: true,
      keepBuffer: 0,
      // Speed hints
      crossOrigin: true
    }).addTo(map);

    // No geolocation: we'll center on a random provider below

    const data = window.providersData || {};
    const items = Object.entries(data).map(([k, p]) => ({ ...p, id: p && p.id ? p.id : k }));
    // Random initial center from one provider
    const withCoords = items.filter(p => p && p.coords);
    if (withCoords.length) {
      const rnd = withCoords[Math.floor(Math.random() * withCoords.length)];
      map.setView([rnd.coords.lat, rnd.coords.lng], 12);
      // prepare regions and label based on this provider
      initRegions(items);
      const regionName = regionNameFromLocation(rnd.location);
      const idx = Math.max(0, regions.findIndex(r => r.name === regionName));
      currentRegionIndex = idx === -1 ? 0 : idx;
      suppressInitialFit = true; // keep random center; only update label/ticker
    } else {
      initRegions(items);
      map.fitBounds(taiwanBounds);
    }
    items.forEach(p => {
      if (!p.coords) return;
      const marker = L.marker([p.coords.lat, p.coords.lng]).addTo(map);
      const href = `./provider.html?id=${encodeURIComponent(p.id)}`;

      // Make popup clickable and remove the "wait" logic
      const popupHtml = `
        <div style="cursor:pointer; text-align:center" onclick="window.open('${href}', '_blank')">
          <strong class="text-lg">${p.name}</strong><br>
          <span style="font-size:12px;color:#6b7280">點擊查看詳情</span>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        // 第一次：只開啟名稱；第二次：導向
        if (!marker.isPopupOpen()) {
          marker.openPopup();
          marker.__armed = true;
          // 給使用者 3 秒內第二次點擊才會跳轉，超時重新計數
          clearTimeout(marker.__armTimer);
          marker.__armTimer = setTimeout(() => { marker.__armed = false; }, 3000);
        } else {
          if (marker.__armed) {
            window.open('${href}', '_blank');
          } else {
            marker.openPopup();
            marker.__armed = true;
            clearTimeout(marker.__armTimer);
            marker.__armTimer = setTimeout(() => { marker.__armed = false; }, 3000);
          }
        }
      });

      // Also allow hover to open for desktop convenience
      marker.on('mouseover', () => {
        marker.openPopup();
      });
    });

    // Wheel zoom guard
    installWheelGuard(map, mapEl);

    // Regions and ticker
    initRegionTicker();
  }

  function setupObserver() {
    const mapEl = document.getElementById('chiayi-map');
    if (!mapEl) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          initMap();
          io.disconnect();
        }
      });
    }, { threshold: 0.1, rootMargin: '600px 0px' });
    io.observe(mapEl);
  }

  function regionNameFromLocation(loc) {
    if (!loc) return '';
    return String(loc).trim().split(/\s+/)[0];
  }

  function initRegions(items) {
    const groups = new Map();
    items.forEach(p => {
      const r = regionNameFromLocation(p.location);
      if (!r) return;
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r).push(p);
    });
    regions = Array.from(groups.entries()).map(([name, arr]) => {
      // compute bounds from providers in region
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      arr.forEach(p => { if (p.coords) { minLat = Math.min(minLat, p.coords.lat); maxLat = Math.max(maxLat, p.coords.lat); minLng = Math.min(minLng, p.coords.lng); maxLng = Math.max(maxLng, p.coords.lng); } });
      if (!isFinite(minLat)) return null;
      const pad = 0.05;
      const bounds = L.latLngBounds([minLat - pad, minLng - pad], [maxLat + pad, maxLng + pad]);
      const center = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
      return { name, bounds, center };
    }).filter(Boolean);
    if (regions.length === 0) {
      regions = [{ name: '台灣', bounds: taiwanBounds, center: [23.7, 121] }];
    }
  }

  function updateRegionUI() {
    const label = document.getElementById('map-region-label');
    const ticker = document.getElementById('region-ticker');
    if (!regions.length) return;
    const r = regions[currentRegionIndex % regions.length];
    if (label) label.textContent = r.name;
    if (ticker) ticker.textContent = regions.map(x => x.name).join(' · ');
    if (map && !suppressInitialFit) {
      if (r.bounds) map.fitBounds(r.bounds, { padding: [20, 20] }); else map.setView(r.center, 11);
    }
    suppressInitialFit = false;
  }

  let tickerTimer;
  function initRegionTicker() {
    const prev = document.getElementById('region-prev');
    const next = document.getElementById('region-next');
    if (prev) prev.addEventListener('click', () => { currentRegionIndex = (currentRegionIndex - 1 + regions.length) % regions.length; updateRegionUI(); });
    if (next) next.addEventListener('click', () => { currentRegionIndex = (currentRegionIndex + 1) % regions.length; updateRegionUI(); });
    updateRegionUI();
  }

  function restartTicker() {
    // Disabled auto-rotation by default; keep function for future use
    if (tickerTimer) { clearInterval(tickerTimer); tickerTimer = null; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObserver);
  } else {
    setupObserver();
  }
})();
