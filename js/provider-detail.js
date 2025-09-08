// Render provider detail page based on URL ?id=...
(function () {
  function qs(selector, root = document) { return root.querySelector(selector); }
  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function render(provider) {
    const root = qs('#provider-root');
    if (!root) return;

    const imagesHtml = (provider.images || []).map((src, i) => `
      <img src="${src}" loading="lazy" alt="${provider.name} 活動照片 ${i + 1}" class="w-full h-56 object-cover rounded-lg shadow transition-transform duration-300 hover:scale-105"/>
    `).join('');

    const timelineHtml = (provider.timeline || []).map(item => `
      <div class="flex gap-4 items-start">
        <div class="text-sm font-mono text-gray-500 dark:text-gray-400 w-16">${item.time}</div>
        <div>
          <div class="font-semibold">${item.title}</div>
          <div class="text-gray-600 dark:text-gray-300">${item.detail}</div>
        </div>
      </div>
    `).join('<div class="h-4"></div>');

    const casesHtml = (provider.cases || []).map(c => `
      <li class="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 shadow transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700">
        <div class="font-semibold">${c.title}</div>
        <div class="text-gray-600 dark:text-gray-300">${c.summary}</div>
      </li>
    `).join('');

    root.innerHTML = `
      <nav class="text-sm mb-6" aria-label="麵包屑">
        <a class="text-blue-500 hover:underline" href="./explore.html">探索資源平台</a>
        <span class="mx-2 text-gray-400">/</span>
        <span class="text-gray-500 dark:text-gray-300">${provider.name}</span>
      </nav>

      <header class="mb-8">
        <h1 class="text-3xl md:text-4xl font-bold">${provider.name}</h1>
        <div class="mt-2 inline-block bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-sm px-2 py-1 rounded">${provider.category}</div>
        <p class="mt-4 text-gray-700 dark:text-gray-300">${provider.description}</p>
      </header>

      ${(() => {
        const blocks = [
          { key: 'know', title: '你將認識', color: 'from-blue-500/10', icon: '📘' },
          { key: 'learn', title: '你將學到', color: 'from-green-500/10', icon: '🛠️' },
          { key: 'gain', title: '你將獲得', color: 'from-purple-500/10', icon: '🏆' }
        ];
        const hasAny = blocks.some(b => Array.isArray(provider[b.key]) && provider[b.key].length);
        if (!hasAny) return '';
        const cols = blocks.map(b => {
          const items = (provider[b.key] || []).map(v => `<li class="flex items-start gap-2"><span class="text-blue-500">•</span><span>${v}</span></li>`).join('');
          return `
            <div class="p-5 rounded-lg bg-gradient-to-br ${b.color} to-transparent shadow">
              <div class="flex items-center gap-2 mb-2"><span>${b.icon}</span><h3 class="font-semibold">${b.title}</h3></div>
              <ul class="space-y-1 text-gray-700 dark:text-gray-200 text-sm">${items}</ul>
            </div>
          `;
        }).join('');
        return `<section class="grid md:grid-cols-3 gap-4 mb-10">${cols}</section>`;
      })()}

      <section aria-labelledby="sec-info" class="grid md:grid-cols-3 gap-6 mb-12">
        <div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 shadow">
          <div class="text-gray-500 text-sm">課程時間</div>
          <div class="font-semibold mt-1">${provider.schedule || '-'}</div>
        </div>
        <div class="p-6 rounded-lg bg-gray-50 dark:bg-gray-800 shadow md:col-span-2">
          <div class="text-gray-500 text-sm">地點（點我開啟 Google 地圖）</div>
          ${(() => {
            const lat = provider.coords?.lat;
            const lng = provider.coords?.lng;
            const url = provider.gmapUrl || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null);
            const name = [provider.location || '', provider.address || ''].filter(Boolean).join(' ');
            const coord = (lat && lng) ? `${lat.toFixed(3)}, ${lng.toFixed(3)}` : '';
            const display = [name, coord ? `（${coord}）` : ''].join('');
            if (!url) return `<div class=\"font-semibold mt-1\">${display || '-'}</div>`;
            return `<a class=\"font-semibold mt-1 text-blue-600 dark:text-blue-400 hover:underline break-all\" href=\"${url}\" target=\"_blank\" rel=\"noopener\">${display || '查看地圖'}</a>`;
          })()}
        </div>
      </section>

      <section aria-labelledby="sec-photos" class="mb-12">
        <div class="flex items-center justify-between mb-4">
          <h2 id="sec-photos" class="text-2xl font-bold">活動照片</h2>
          <a href="#sec-cases" class="text-blue-500 hover:underline">精選案例</a>
        </div>
        <div class="grid md:grid-cols-3 gap-4">
          ${imagesHtml}
        </div>
      </section>

      <section aria-labelledby="sec-map" class="mb-12">
        <h2 id="sec-map" class="text-2xl font-bold mb-4">地圖標示地點</h2>
        <div class="flex items-center gap-3 mb-3">
          <div class="inline-flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden" role="group" aria-label="地圖鎖定方式">
            <button id="lock-county" class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" aria-pressed="false">縣市</button>
            <button id="lock-site" class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" aria-pressed="false">場域</button>
            <button id="lock-none" class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" aria-pressed="false">自由</button>
          </div>
          <span id="lock-label" class="text-sm text-gray-600 dark:text-gray-300">鎖定：初始化中…</span>
        </div>
        <div id="provider-map" class="w-full h-72 rounded-lg shadow"></div>
      </section>

      <section aria-labelledby="sec-timeline" class="mb-12">
        <h2 id="sec-timeline" class="text-2xl font-bold mb-4">課程安排（時間軸）</h2>
        <div class="relative pl-6">
          <div class="absolute left-2 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"></div>
          <div class="space-y-4">
            ${timelineHtml}
          </div>
        </div>
      </section>

      <section aria-labelledby="sec-cases" class="mb-12">
        <h2 id="sec-cases" class="text-2xl font-bold mb-4">精選案例</h2>
        <ul class="space-y-3">
          ${casesHtml}
        </ul>
      </section>
    `;
  }

  function start() {
    const id = getParam('id');
    const dataset = window.providersData || {};
    const provider = dataset[id];
    const root = qs('#provider-root');
    if (!root) return;
    if (!id || !provider) {
      root.innerHTML = `<div class="text-center text-red-500">找不到此業者，請回到「探索資源平台」。</div>`;
      return;
    }
    render(provider);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
