// 動態插入 nav 與 footer 統一元件
function renderNavFooter() {
    // nav 統一元件
    const navHTML = `
    <header class="bg-gray-100 dark:bg-gray-800 shadow-md relative z-50">
        <nav class="container mx-auto px-6 py-4 flex justify-between items-center" role="navigation" aria-label="主選單">
            <a href="./index.html" class="text-2xl font-bold text-gray-800 dark:text-white transition-colors duration-300 hover:text-blue-500">核心生涯探索平台</a>
            <div class="hidden md:flex items-center space-x-6">
                <a href="./about.html" class="nav-link text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors duration-300">關於我們</a>
                <a href="./explore.html" class="nav-link text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors duration-300">探索資源平台</a>
                <a href="./member.html" class="nav-link text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors duration-300">會員專區</a>
                <button id="theme-toggle" aria-label="切換深淺色主題" class="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300">
                    <svg id="theme-toggle-dark-icon" class="hidden h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                    <svg id="theme-toggle-light-icon" class="hidden h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
                </button>
                <div class="flex items-center space-x-2 ml-4">
                    <div class="hidden md:block text-xs text-gray-500 dark:text-gray-400">字體</div>
                    <button id="font-size-btn" aria-label="切換字體大小" class="font-size-btn text-gray-700 dark:text-gray-200" title="點擊切換字體大小 (小/中/大)">
                      <span id="font-size-label" class="font-size-label text-xs">中</span>
                    </button>
                </div>
            </div>
            <div class="md:hidden">
                 <button id="nav-toggle" class="text-gray-800 dark:text-white focus:outline-none transition-colors duration-300" aria-expanded="false" aria-controls="mobile-menu">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                    </svg>
                </button>
            </div>
        </nav>
        <div id="mobile-menu" class="md:hidden hidden px-6 pb-4 mobile-menu-collapsible" aria-hidden="true">
            <div class="flex flex-col space-y-3">
                <a href="./about.html" class="nav-link text-gray-700 dark:text-gray-200 hover:text-blue-500 transition-colors duration-200">關於我們</a>
                <a href="./explore.html" class="nav-link text-gray-700 dark:text-gray-200 hover:text-blue-500 transition-colors duration-200">探索資源平台</a>
                <a href="./member.html" class="nav-link text-gray-700 dark:text-gray-200 hover:text-blue-500 transition-colors duration-200">會員專區</a>
                <div class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button id="theme-toggle-mobile" aria-label="切換深淺色主題" class="mt-2 p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300">
                      <svg id="theme-toggle-dark-icon-mobile" class="hidden h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                      <svg id="theme-toggle-light-icon-mobile" class="hidden h-6 w-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
                    </button>
                    <button id="font-size-btn-mobile" class="mt-2 font-size-btn text-gray-700 dark:text-gray-200" title="切換字體大小"><span class="font-size-label text-xs">中</span></button>
                </div>
            </div>
        </div>
    </header>`;

    // footer 統一元件
    const footerHTML = `
    <footer class="bg-gray-100 dark:bg-gray-800 mt-12">
        <div class="container mx-auto px-6 py-4 text-center text-gray-600 dark:text-gray-400">
            <p>&copy; 2024 核心生涯探索平台. All Rights Reserved.</p>
        </div>
    </footer>`;

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
                a.classList.remove('text-gray-600');
                a.classList.add('text-blue-500', 'font-bold');
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
                document.documentElement.classList.add('overflow-hidden');
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
                document.documentElement.classList.remove('overflow-hidden');
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
}

// 確保無論載入時機，都可以渲染 nav/footer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNavFooter);
} else {
    renderNavFooter();
}
