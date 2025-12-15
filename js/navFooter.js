// 動態插入 nav 與 footer 統一元件
function renderNavFooter() {
  // nav 統一元件
  const navHTML = `
    <header class="bg-[var(--bg-surface)] dark:bg-gray-800 shadow-md relative z-50">
      <nav class="container mx-auto px-6 py-4 flex justify-between items-center" role="navigation" aria-label="主選單">
        <a href="./index.html" class="nav-brand text-2xl font-bold text-gray-800 dark:text-white transition-colors duration-300 hover:text-[var(--primary)]">
          <div class="dark:bg-[radial-gradient(ellipse_at_center,rgba(235,235,235,0.85)_0%,rgba(235,235,235,0.5)_35%,rgba(235,235,235,0.2)_55%,rgba(235,235,235,0)_75%)]">
            <img 
              src="./img/soundcore3co-title.png"
              alt="SoundCore Title"
              class="brand-title-img relative z-10"
            />
          </div>
          <span class="brand-title-text">聽見核心工作室</span>
        </a>

        <div class="hidden md:flex items-center space-x-8">
          <a href="./about.html" class="nav-link text-gray-600 dark:text-gray-300 hover:text-[var(--primary)] transition-colors duration-300">關於我們</a>
          <a href="./explore.html" class="nav-link text-gray-600 dark:text-gray-300 hover:text-[var(--primary)] transition-colors duration-300">探索資源平台</a>
          <a href="./member.html" class="nav-link text-gray-600 dark:text-gray-300 hover:text-[var(--primary)] transition-colors duration-300">會員專區</a>
          <button id="theme-toggle" aria-label="切換深淺色主題" class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300">
            <svg id="theme-toggle-dark-icon" class="hidden h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
            <svg id="theme-toggle-light-icon" class="hidden h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
          </button>
        </div>

        <div class="md:hidden">
          <button id="nav-toggle" class="text-[var(--text-primary)] focus:outline-none transition-colors duration-300" aria-expanded="false" aria-controls="mobile-menu">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
          </button>
        </div>
      </nav>

      <div id="mobile-menu" class="md:hidden hidden px-6 pb-4 mobile-menu-collapsible" aria-hidden="true">
        <div class="flex flex-col space-y-3">
          <a href="./about.html" class="nav-link text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors duration-200">關於我們</a>
          <a href="./explore.html" class="nav-link text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors duration-200">探索資源平台</a>
          <a href="./member.html" class="nav-link text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors duration-200">會員專區</a>
          <div class="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <button id="theme-toggle-mobile" aria-label="切換深淺色主題" class="mt-2 p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/80 transition-colors duration-300">
              <svg id="theme-toggle-dark-icon-mobile" class="hidden h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
              <svg id="theme-toggle-light-icon-mobile" class="hidden h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </header>
`;

  // footer 統一元件（使用者提供之聯絡資訊）
  const footerHTML = `
    <footer class="mt-16 px-6 py-10 border-t border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
  <div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-10">
    
    <!-- 左側品牌與聯絡資訊 -->
    <div class="flex-1 min-w-[260px]">
      <h2 class="text-2xl md:text-3xl font-normal font-[YourCustomFont,'Noto Sans TC',sans-serif] flex items-center gap-2">
        聽見核心工作室
        <img 
          src="./img/soundcore3co-min.png" 
          alt="Logo Icon"
          class="w-7 h-7 filter grayscale dark:color-[#e0e0e0] transition duration-300 hover:grayscale-0"
        />
      </h2>

      <div class="mt-4 space-y-2 text-sm md:text-base">
        <p class="text-gray-700 dark:text-gray-100"><i class="fas fa-phone mr-2 text-gray-600 dark:text-gray-150"></i>0988-368-450</p>
        <p class="text-gray-700 dark:text-gray-100">
          <i class="fas fa-envelope mr-2 text-gray-600 dark:text-gray-150"></i>
          <a href="mailto:soundcore.3co@gmail.com" class="hover:text-[var(--primary-light)] hover:underline transition-colors duration-200">
            soundcore.3co@gmail.com
          </a>
        </p>
      </div>
    </div>

    <!-- 右側社群連結 -->
    <div class="flex flex-col gap-4 justify-start min-w-[200px]">
      <h3 class="text-lg font-semibold">追蹤我們</h3>
      <div class="flex items-center gap-5">
        <!-- Facebook -->
        <a href="https://www.facebook.com/profile.php?id=61571413520720&locale=zh_TW" target="_blank" aria-label="Facebook">
          <svg 
            class="w-6 h-6 transition duration-300 hover:text-[#1877F2] dark:color-[#e0e0e0]" 
            viewBox="0 0 24 24" 
            fill="currentColor">
            <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/>
          </svg>
        </a>


        <a href="https://instagram.com/soundcore_2025/" target="_blank" aria-label="Instagram">
          <svg 
            class="w-6 h-6 transition duration-300 hover:text-[#E4405F] dark:color-[#e0e0e0]" 
            viewBox="0 0 24 24" 
            fill="currentColor">
            <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/>
          </svg>
        </a>

        <a href="https://lin.ee/1C3roAfA" target="_blank" aria-label="Line">
          <svg 
            class="w-6 h-6 transition duration-300 hover:text-[#00C300] dark:color-[#e0e0e0]" 
            viewBox="0 0 24 24" 
            fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
        </a>

        <a href="https://www.threads.net/@soundcore_2025?hl=zh-tw" target="_blank" aria-label="Threads">
          <svg 
            class="w-6 h-6 transition duration-300 hover:text-[#000000] dark:color-[#e0e0e0]" 
            viewBox="0 0 24 24" 
            fill="currentColor">
            <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"/>
          </svg>
        </a>
      </div>
    </div>
  </div>

  <!-- 底部版權 -->
  <div class="mt-8 text-center text-xs text-gray-500 dark:text-gray-150">
    &copy; 2025 聽見核心工作室 SoundCore 3Co. All rights reserved.
  </div>
</footer>`
    ;

  // 插入到指定的 placeholder
  const navPlaceholder = document.getElementById('nav-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (navPlaceholder) navPlaceholder.innerHTML = navHTML;
  if (footerPlaceholder) footerPlaceholder.innerHTML = footerHTML;

  // 設定當前頁面 active 樣式與 aria 屬性
  try {
    const current = (location.pathname.split('/').pop() || 'index.html').replace('#', '');
    const links = document.querySelectorAll('.nav-link');
    links.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const file = href.split('/').pop();
      if (file === current || (current === '' && file === 'index.html')) {
        a.classList.remove('text-gray-600', 'dark:text-gray-300');
        a.classList.add('text-[var(--primary)]', 'font-bold');
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  } catch (e) {
    console.warn('Active nav highlight failed:', e);
  }

  // 綁定手機選單開關
  try {
    const btn = document.getElementById('nav-toggle');
    const panel = document.getElementById('mobile-menu');
    if (btn && panel) {
      const openMenu = () => {
        panel.classList.remove('hidden');
        panel.setAttribute('aria-hidden', 'false');
        // force reflow, then add open for transition
        void panel.offsetHeight;
        panel.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      };
      const closeMenu = () => {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        panel.setAttribute('aria-hidden', 'true');
        const hide = () => { panel.classList.add('hidden'); };
        // wait for transition end, with fallback timeout
        const onEnd = (e) => { if (e.target === panel) { panel.removeEventListener('transitionend', onEnd); hide(); } };
        panel.addEventListener('transitionend', onEnd);
        setTimeout(() => { panel.removeEventListener('transitionend', onEnd); hide(); }, 280);
      };

      btn.addEventListener('click', () => {
        const isOpen = panel.classList.contains('open') && !panel.classList.contains('hidden');
        if (isOpen) closeMenu(); else openMenu();
      });
      // 點擊連結後自動收合
      panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        closeMenu();
      }));
      // 手機上的主題與字級按鈕委派到桌面版按鈕
      document.getElementById('theme-toggle-mobile')?.addEventListener('click', () => document.getElementById('theme-toggle')?.click());
      document.getElementById('font-size-btn-mobile')?.addEventListener('click', () => document.getElementById('font-size-btn')?.click());
    }
  } catch (e) {
    console.warn('Mobile menu bind failed:', e);
  }

  // 通知其他腳本 nav/footer 已經注入
  document.dispatchEvent(new CustomEvent('nav-footer-rendered'));

  // 動態在頁尾注入共用與頁面腳本，集中管理
  try {
    (async function injectScripts() {
      const page = (location.pathname.split('/').pop() || 'index.html').replace('#', '');
      let base = [
        './js/config.js',
        './js/toast.js',
        './js/data-loader.js',
        './js/data/providers.js',
        './js/main.js'
      ];
      const perPage = [];
      const styles = [];
      // Global styles used across pages (use FA v5 to match existing 'fas' usage)
      try {
        styles.push('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');
      } catch (e) { }
      if (page === 'explore.html') {
        perPage.push('./js/explore.js');
      } else if (page === 'member.html') {
        perPage.push('./js/auth.js', './js/member-ui.js');
      } else if (page === 'index.html') {
        styles.push('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        perPage.push('./js/data/siteContent.js', './js/content-render.js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', './js/map-index.js');
      } else if (page === 'provider.html') {
        styles.push('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        perPage.push('./js/provider-detail.js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', './js/map-provider.js');
      } else if (page === 'about.html') {
        perPage.push('./js/data/aboutContent.js', './js/about.js');
      } else if (page === 'admin.html') {
        // 後台需要以本地 js/data 為來源（非 GAS），因此一併載入三個資料檔
        perPage.push('./js/data/aboutContent.js', './js/data/siteContent.js', './js/auth.js', './js/admin.js');
      } else if (page === 'member-profile.html') {
        // 確保依賴順序：先載入 auth 與 member-data，再載入頁面腳本，避免 window.MemberData 尚未存在就執行導致被導回登入頁
        perPage.push('./js/auth.js', './js/member-data.js', './js/member-profile.js');
      }
      else if (page === 'member-admin.html') {
        perPage.push('./js/auth.js', './js/member-admin.js');
      }

      const containerId = 'global-script-bundle';
      let bundle = document.getElementById(containerId);
      if (!bundle) {
        bundle = document.createElement('div');
        bundle.id = containerId;
        (footerPlaceholder || document.body).appendChild(bundle);
      }

      // Compute site data-driven asset version based on AppConfig.versionCacheKey cache in localStorage,
      // fallback to per-session asset_v or Date.now
      const __assetV = (() => {
        try {
          const K = (window.AppConfig && window.AppConfig.versionCacheKey) || 'app_data_version';
          const raw = localStorage.getItem(K);
          if (raw) {
            const versions = JSON.parse(raw || '{}') || {};
            if (versions && typeof versions === 'object') {
              const vals = Object.values(versions);
              if (vals && vals.length) { return vals.join('.'); }
            }
          }
        } catch (e) { }
        try {
          const k = 'asset_v';
          let v = sessionStorage.getItem(k);
          if (!v) { v = String(Date.now()); sessionStorage.setItem(k, v); }
          return v;
        } catch { return String(Date.now()); }
      })();

      // Update existing local CSS link tags in the page to ensure they carry the same ?v
      (function patchExistingAssets() {
        try {
          function setParam(u) {
            try { const url = new URL(u, document.baseURI); url.searchParams.set('v', __assetV); return url.href; }
            catch { return (u.split('#')[0].replace(/([?&])v=[^&]*(&|$)/, '$1').replace(/[?&]$/, '')) + (u.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(__assetV); }
          }
          // Patch local stylesheets
          document.querySelectorAll('link[rel="stylesheet"][href^="./"], link[rel="stylesheet"][href^="css/"]').forEach(l => {
            const href = l.getAttribute('href') || '';
            if (/^https?:/i.test(href)) return; // skip CDN
            l.href = setParam(href);
          });
        } catch (e) { /* noop */ }
      })();

      function resolveAbs(u) { try { return new URL(u, document.baseURI).href; } catch { return u; } }
      function addVersionParam(u) {
        try { const url = new URL(u, document.baseURI); if (!url.searchParams.has('v')) url.searchParams.set('v', __assetV); return url.href; }
        catch { return (u + (u.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(__assetV)); }
      }
      function normalizeNoV(u) {
        try { const url = new URL(u, document.baseURI); url.searchParams.delete('v'); return url.href; }
        catch {
          try { return u.replace(/([?&])v=[^&]*(&|$)/, '$1').replace(/[?&]$/, ''); } catch { return u; }
        }
      }
      function addScriptOnce(src) {
        const targetNoV = normalizeNoV(resolveAbs(src));
        const already = Array.from(document.scripts).some(s => {
          const cur = s.src ? normalizeNoV(resolveAbs(s.src)) : '';
          return cur === targetNoV;
        });
        if (already) return Promise.resolve();
        return new Promise((resolve) => {
          const s = document.createElement('script');
          s.src = addVersionParam(src); s.defer = false; s.async = false;
          s.onload = () => resolve();
          s.onerror = (e) => { console.warn('Script load failed:', src, e); resolve(); };
          bundle.appendChild(s);
        });
      }

      function addStyleOnce(href) {
        const targetNoV = normalizeNoV(resolveAbs(href));
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        const hit = links.some(l => {
          const cur = l.href || '';
          const curNoV = normalizeNoV(cur);
          return curNoV === targetNoV;
        });
        if (hit) return Promise.resolve();
        return new Promise((resolve) => {
          const l = document.createElement('link');
          l.rel = 'stylesheet';
          l.href = addVersionParam(href);
          l.onload = () => resolve();
          l.onerror = () => { console.warn('Stylesheet load failed:', href); resolve(); };
          document.head.appendChild(l);
        });
      }

      // 依序載入，確保依賴順序（先樣式後腳本）
      for (const href of styles) { await addStyleOnce(href); }
      for (const src of base) { await addScriptOnce(src); }
      for (const src of perPage) { await addScriptOnce(src); }
    })();
  } catch (e) {
    console.warn('Footer script injection failed:', e);
  }
}

// 確保無論載入時機，都可以渲染 nav/footer
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderNavFooter);
} else {
  renderNavFooter();
}
