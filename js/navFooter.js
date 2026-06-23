// Shared navigation and footer for the warm institution redesign.
(function () {
  const CONTACT = {
    name: '聽見核心工作室',
    phone: '0988-368-450',
    phoneRaw: '0988368450',
    email: 'soundcore.3co@gmail.com',
    address: '嘉義市西區車店里蘭州五街66號',
    taxId: '94369582',
    line: 'https://lin.ee/1C3roAfA',
    facebook: 'https://www.facebook.com/profile.php?id=61571413520720&locale=zh_TW',
    instagram: 'https://instagram.com/soundcore_2025/',
    threads: 'https://www.threads.net/@soundcore_2025?hl=zh-tw',
    gmap: 'https://maps.google.com/?q=嘉義市西區車店里蘭州五街66號'
  };
  window.contactData = CONTACT;

  const navItems = [
    ['index.html', '首頁'],
    ['about.html', '關於我們'],
    ['services.html', '服務項目'],
    ['explore.html', '探索資源'],
    ['blog.html', '最新消息']
  ];

  function currentPage() {
    return (location.pathname.split('/').pop() || 'index.html').replace('#', '') || 'index.html';
  }

  function navLinks(className = 'nav-link') {
    const cur = currentPage();
    return navItems.map(([href, label]) => {
      const active = cur === href || (cur === '' && href === 'index.html');
      return `<a class="${className}" href="./${href}"${active ? ' aria-current="page"' : ''}><span class="nav-link-text">${label}</span><svg class="nav-link-ring" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="97" height="37" rx="18.5" ry="18.5" pathLength="320"></rect></svg></a>`;
    }).join('');
  }

  function socialSvg(type) {
    const icons = {
      facebook: '<path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103.448.054.84.121 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.673 3.667h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/>',
      instagram: '<path d="M7.03.084c-1.277.06-2.149.264-2.911.563-.789.308-1.458.72-2.123 1.388C1.331 2.703.921 3.372.616 4.162.321 4.926.121 5.799.064 7.076.008 8.354-.004 8.764.002 12.023c.006 3.259.02 3.667.083 4.947.061 1.277.264 2.148.563 2.911.308.789.72 1.457 1.388 2.123.668.665 1.337 1.074 2.129 1.38.763.295 1.636.496 2.913.552 1.277.056 1.688.069 4.946.063 3.258-.006 3.668-.021 4.948-.081 1.28-.061 2.147-.265 2.91-.563.789-.309 1.458-.72 2.123-1.388.665-.668 1.074-1.338 1.379-2.128.296-.763.497-1.636.552-2.912.056-1.281.069-1.69.063-4.948-.006-3.258-.021-3.667-.082-4.947-.061-1.28-.264-2.149-.563-2.912-.308-.789-.72-1.457-1.388-2.123C21.298 1.33 20.628.921 19.838.617 19.074.321 18.202.12 16.924.065 15.647.009 15.236-.005 11.977.001 8.718.008 8.31.022 7.03.084Zm.14 21.693c-1.17-.051-1.805-.245-2.229-.408-.56-.216-.96-.477-1.382-.895-.422-.418-.681-.819-.9-1.378-.164-.423-.362-1.058-.417-2.228-.059-1.265-.072-1.644-.079-4.848-.007-3.204.005-3.583.061-4.848.05-1.169.245-1.805.408-2.228.216-.561.476-.96.895-1.382.419-.421.818-.681 1.378-.9.423-.165 1.058-.361 2.227-.417 1.266-.06 1.645-.072 4.848-.079 3.203-.007 3.584.005 4.85.061 1.168.05 1.805.244 2.228.408.561.216.96.475 1.382.895.421.419.681.818.9 1.379.165.421.362 1.056.417 2.226.06 1.266.074 1.645.08 4.848.006 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.805-.408 2.229-.216.56-.476.96-.895 1.381-.419.422-.818.681-1.378.9-.423.165-1.058.362-2.227.417-1.266.06-1.645.072-4.849.079-3.205.007-3.583-.006-4.848-.061ZM16.953 5.586A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.442ZM5.839 12.012a6.163 6.163 0 1 0 12.323-.024 6.163 6.163 0 0 0-12.323.024ZM8 12.008a4 4 0 1 1 4.008 3.992A4 4 0 0 1 8 12.008Z"/>',
      line: '<path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755Zm-3.855 3.016c0 .27-.174.51-.432.596a.634.634 0 0 1-.709-.219l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595a.61.61 0 0 1 .689.221l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771Zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771Zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629ZM24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314Z"/>',
      threads: '<path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221Z"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${icons[type] || ''}</svg>`;
  }

  function render() {
    document.documentElement.classList.remove('dark');
    try { localStorage.removeItem('color-theme'); } catch (e) {}

    const navPlaceholder = document.getElementById('nav-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (navPlaceholder) {
      navPlaceholder.innerHTML = `
        <header class="site-header">
          <div class="site-header__inner">
            <a class="site-brand" href="./index.html" aria-label="聽見核心工作室首頁">
              <img decoding="async" src="./img/soundcore3co-title.webp" alt="聽見核心工作室">
              <span>聽見核心工作室</span>
            </a>
            <nav class="site-nav" aria-label="主選單">
              ${navLinks()}
              <a class="nav-cta" href="#contact">聯絡我們</a>
            </nav>
            <button class="nav-menu-button" id="nav-toggle" aria-expanded="false" aria-controls="mobile-menu" aria-label="開啟選單">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
          </div>
          <div class="mobile-menu" id="mobile-menu" aria-hidden="true">
            <div class="mobile-menu__inner">
              ${navLinks()}
              <a class="nav-cta" href="#contact">聯絡我們</a>
            </div>
          </div>
        </header>`;
    }

    if (footerPlaceholder) {
      footerPlaceholder.innerHTML = `
        <footer class="site-footer" id="contact">
          <div class="container-wide site-footer__contact">
            <div class="stack-sm">
              <span class="section-label">contact</span>
              <h2>需要討論課程、合作場域或青少年支持方案嗎？</h2>
              <p>可以直接來電、加入 LINE 或寄信，我們會協助整理需求，安排適合的探索與陪伴方式。</p>
              <div class="action-row" style="margin-top:22px">
                <a class="button-primary" href="tel:${CONTACT.phoneRaw}">電話聯絡</a>
                <a class="button-secondary" href="${CONTACT.line}" target="_blank" rel="noopener">加入 LINE</a>
              </div>
            </div>
            <div class="site-footer__image interactive-image">
              <img decoding="async" src="./img/主頁/主頁大照片/LINE_ALBUM_2025126_251208_54.webp" alt="活動現場照片" loading="lazy">
            </div>
          </div>
          <div class="container-wide site-footer__grid">
            <div>
              <div class="site-footer__title">聽見核心工作室</div>
              <p>孩子成長路上的陪跑者。聽見、看見、感受每個孩子的需要。</p>
            </div>
            <div>
              <div class="site-footer__title">聯絡資訊</div>
              <div class="footer-links">
                <a class="footer-contact-line" href="${CONTACT.gmap}" target="_blank" rel="noopener">${CONTACT.address}</a>
                <button type="button" id="copy-phone-btn" class="footer-contact-line footer-copy">${CONTACT.phone}</button>
                <a class="footer-contact-line" href="mailto:${CONTACT.email}">${CONTACT.email}</a>
                <span class="footer-contact-line">統編：${CONTACT.taxId}</span>
              </div>
            </div>
            <div>
              <div class="site-footer__title">網站地圖</div>
              <div class="footer-links">${navItems.map(([href,label]) => `<a class="footer-link" href="./${href}">${label}</a>`).join('')}</div>
            </div>
            <div>
              <div class="site-footer__title">社群</div>
              <div class="footer-socials">
                <a class="footer-social footer-social--facebook" href="${CONTACT.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${socialSvg('facebook')}</a>
                <a class="footer-social footer-social--instagram" href="${CONTACT.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${socialSvg('instagram')}</a>
                <a class="footer-social footer-social--line" href="${CONTACT.line}" target="_blank" rel="noopener" aria-label="Line">${socialSvg('line')}</a>
                <a class="footer-social footer-social--threads" href="${CONTACT.threads}" target="_blank" rel="noopener" aria-label="Threads">${socialSvg('threads')}</a>
              </div>
            </div>
          </div>
          <div class="container-wide footer-bottom">Copyright &copy; 2026 Sound Core 聽見核心工作室. All Rights Reserved.</div>
        </footer>`;
    }

    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('mobile-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = !menu.classList.contains('open');
        menu.classList.toggle('open', open);
        menu.setAttribute('aria-hidden', String(!open));
        toggle.setAttribute('aria-expanded', String(open));
      });
      menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        menu.classList.remove('open');
        menu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
      }));
    }

    document.querySelectorAll('a[href="#contact"]').forEach(link => {
      link.addEventListener('click', e => {
        const target = document.getElementById('contact');
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const copy = document.getElementById('copy-phone-btn');
    if (copy) copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(CONTACT.phoneRaw); } catch (e) {}
      if (window.Toast) window.Toast.show('電話已複製', 'success', 1500);
    });

    document.dispatchEvent(new CustomEvent('nav-footer-rendered'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();


