// Render About page from window.aboutContent with interactions
(function () {
  function qs(s, r = document) { return r.querySelector(s) }
  function el(tag, cls) { const x = document.createElement(tag); if (cls) x.className = cls; return x; }
  function prefersReduced() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  const typingControllers = new WeakMap();
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function charDelay(ch, base) {
    const punct = '，。．、；：！？?!,.…';
    const slow = '—–-';
    let d = base * (0.7 + Math.random() * 0.6); // jitter
    if (punct.includes(ch)) d += base * 3 + Math.random() * 120;
    if (slow.includes(ch)) d += base * 2;
    if (ch === ' ') d += 15;
    return d;
  }
  async function typeText(el, text, base = 28) {
    if (!el) return;
    if (prefersReduced()) { el.textContent = text || ''; return; }
    el.textContent = '';
    const ctrl = { abort: false };
    typingControllers.set(el, ctrl);
    const chars = Array.from(String(text || ''));
    for (let i = 0; i < chars.length; i++) {
      if (ctrl.abort) { el.textContent = text || ''; break; }
      el.textContent += chars[i];
      await sleep(charDelay(chars[i], base));
    }
    typingControllers.delete(el);
  }

  // Shatter effect removed for editorial style consistency
  function fadeAndReveal(el, fullText) {
    if (!el) return;
    el.style.opacity = 0;
    el.textContent = fullText || '';
    setTimeout(() => {
      el.style.transition = 'opacity 0.5s ease';
      el.style.opacity = 1;
    }, 50);
  }



  function attachCardInteractions(container) {
    container.querySelectorAll('.about-card, .team-card').forEach(card => {
      // Simplified interaction: just slight lift is enough (handled by CSS hover)
      card.addEventListener('click', (e) => {
        if (e.target && e.target.closest('a')) return;
        if (card.classList.contains('team-card')) card.classList.toggle('flipped');
      });
    });
  }

  function animateOnView(elements) {
    if (!elements || !elements.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.style.transition = 'opacity .5s ease, transform .5s ease';
          en.target.style.opacity = '1';
          en.target.style.transform = 'none';
          io.unobserve(en.target);
        }
      })
    }, { threshold: 0.15 });
    elements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      io.observe(el);
    });
  }

  function render() {
    const data = window.aboutContent || {};
    const root = qs('#about-root');
    if (!root) return;
    root.innerHTML = `
      <header class="mb-12 text-center">
        <h1 class="heading-display"><span id="hero-typed"></span></h1>
        <p class="mt-3 lead-text text-[var(--text-primary)]"><span id="lead-typed"></span></p>
      </header>

      <section class="mt-12">
        <h2 class="heading-section mb-6">${data.modelTitle || '四階段引導模型'}</h2>
        <div class="model-steps" id="model-steps">
          ${(data.model || []).map((m, index) => {
      const link = (m && m.href) ? `<a class="model-link" href="${m.href}" target="_blank" rel="noopener">${m.linkText || '前往連結'} <span class="arrow">→</span></a>` : '';
      return `
            <div class="model-step model-step-${index + 1}" data-index="${index + 1}">
              <div class="model-marker">${index + 1}</div>
              <div class="model-card">
                <h3 class="model-title">${m.title}</h3>
                <p class="model-desc">${m.desc || ''}</p>
                ${link}
              </div>
            </div>`;
    }).join('')}
      </section>

      <div id="achievements-placeholder"></div>


      ${Array.isArray(data.team) && data.team.length ? `
      <section id=\"team\" class=\"mt-16 team-section rounded-lg\">
        <h2 class=\"heading-section mb-8 text-center\">Our Team.</h2>
        <div class=\"team-grid\">
          ${data.team.map(t => {
      const roles = (t.roles || []).map(r => `<span class=\"inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] mr-1 mb-1 border border-[var(--primary)]/20\">${r}</span>`).join('');
      const motto = t.motto ? `<p class=\"motto italic text-sm text-gray-500 dark:text-gray-400 mt-3\">\"${t.motto}\"</p>` : '';
      const edu = (t.education || []).map(d => `<li class=\"text-sm text-gray-600 dark:text-gray-300 mb-1\">${d}</li>`).join('');
      const exp = (t.experience || []).map(d => `<li class=\"text-sm text-gray-600 dark:text-gray-300 mb-1\">${d}</li>`).join('');
      const socials = (t.socials || []).map(s => {
        const key = String(s.name || '').toLowerCase();
        let icon = '';
        let hoverColor = 'hover:text-[var(--primary)]'; // default
        if (key === 'facebook' || key === 'fb') {
          icon = '<i class="fab fa-facebook"></i>';
          hoverColor = 'hover:text-[#1877F2]';
        }
        else if (key === 'instagram' || key === 'ig') {
          icon = '<i class="fab fa-instagram"></i>';
          hoverColor = 'hover:text-[#E4405F]';
        }
        else if (key === 'line') {
          icon = '<i class="fab fa-line"></i>';
          hoverColor = 'hover:text-[#00C300]';
        }
        else if (key === 'threads') {
          icon = '<i class="fab fa-threads"></i>';
          hoverColor = 'hover:text-black dark:hover:text-white';
        }
        else if (key === 'youtube' || key === 'yt') {
          icon = '<i class="fab fa-youtube"></i>';
          hoverColor = 'hover:text-[#FF0000]';
        }
        else {
          icon = '<i class="fas fa-link"></i>';
        }
        return `<a href="${s.href}" target="_blank" rel="noopener" class="text-gray-500 ${hoverColor} transition-colors duration-300" onclick="event.stopPropagation()">${icon}</a>`;
      }).join(' ');
      return `
            <article class=\"team-card\" tabindex=\"0\" role=\"button\" aria-label=\"${t.name || ''} 學經歷\">
              <div class=\"card-inner\">
                <div class="card-face front">
                  ${t.photo ? `<!-- 原代碼: <img decoding="async" class="team-photo-img" src="${t.photo}" alt="${t.name || ''}"> -->
                  <figure class="image-frame image-frame--portrait w-full h-[400px] sm:h-[300px] md:h-[300px] lg:h-[400px]">
                    <img decoding="async" class="team-photo-img" src="${t.photo}" alt="${t.name || ''}">
                  </figure>` : '<div class=\"team-photo-placeholder\"></div>'}
                  <div class=\"team-info\">
                    <div class=\"team-roles\">${roles}</div>
                    <h4 class=\"team-name\">${t.name || ''}</h4>
                    ${motto}
                  </div>
                </div>
                <div class=\"card-face back\">
                  <div class=\"team-back-content\">
                    <h4 class=\"team-name mb-2\">${t.name || ''}</h4>
                      ${edu ? `<div class="mb-4"><p class="text-sm font-bold text-[var(--primary)] mb-2 tracking-wider">學歷</p><ul class="list-disc pl-4">${edu}</ul></div>` : ''}
                      ${exp ? `<div class="mb-4"><p class="text-sm font-bold text-[var(--primary)] mb-2 tracking-wider">經歷</p><ul class="list-disc pl-4">${exp}</ul></div>` : ''}
                    ${socials ? `<div class=\"team-socials flex gap-3 mt-3\">${socials}</div>` : ''}
                  </div>
                </div>
              </div>
            </article>`;
    }).join('')}
        </div>
      </section>
      ` : ''}
    `;

    if (window.renderAchievements) {
      window.renderAchievements('achievements-placeholder', data);
    }

    // typing effects with click-to-shatter
    const heroEl = qs('#hero-typed', root);
    const leadEl = qs('#lead-typed', root);
    typeText(heroEl, data.heroTitle || '關於我們', 26);
    // 若 lead 含 HTML（例如 <a> 或 <br>），直接 innerHTML 呈現，不做打字動畫
    const leadStr = data.lead || '';
    const hasHtml = /<\s*a\b|<\s*br\b|<\s*span\b|<\s*div\b|&lt;/.test(leadStr);
    if (hasHtml) {
      leadEl.innerHTML = leadStr;
    } else {
      setTimeout(() => typeText(leadEl, leadStr, 14), 150);
      leadEl?.addEventListener('click', () => fadeAndReveal(leadEl, leadStr));
    }
    heroEl?.addEventListener('click', () => fadeAndReveal(heroEl, data.heroTitle || '關於我們'));

    // interactions and animations
    attachCardInteractions(root);
    const toAnimate = Array.from(root.querySelectorAll('.about-card, .team-card, .model-step'));
    animateOnView(toAnimate);

    // Smooth scroll to hash anchor on page load
    if (window.location.hash) {
      setTimeout(() => {
        const target = document.querySelector(window.location.hash);
        if (target) {
          const yOffset = -90;
          const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 300);
    }

    // // 進場時重新計算階梯位移（考慮到每張卡片原始高度）
    // function adjustModelStairs() {
    //   const container = root.querySelector('.model-steps'); if (!container) return;
    //   const steps = Array.from(container.querySelectorAll('.model-step'));
    //   if (!steps.length) return;
    //   const heights = steps.map(s => s.getBoundingClientRect().height);
    //   const Hmax = Math.max(...heights);
    //   const n = steps.length; const step = 14; // 每階小幅度
    //   steps.forEach((el, i) => {
    //     const desiredTop = (n - 1 - i) * step;
    //     const currentTop = Hmax - heights[i];
    //     const delta = desiredTop - currentTop; // 允許負值（往上移）
    //     el.style.setProperty('--offset', `${delta}px`);
    //   });
    // }
    // // 初次與視窗尺寸變更時重算
    // setTimeout(adjustModelStairs, 0);
    // window.addEventListener('resize', adjustModelStairs);

    // Team：點擊/鍵盤卡片翻面顯示學經歷（忽略卡片內連結與互動元素）
    try {
      const cards = Array.from(root.querySelectorAll('.team-card'));
      
      // Mobile auto-flip when scrolled into view (once only)
      if (window.innerWidth <= 768 && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const card = entry.target;
              if (card.dataset.autoFlipped !== 'true') {
                card.dataset.autoFlipped = 'true';
                setTimeout(() => {
                  card.classList.add('flipped');
                }, 300);
                observer.unobserve(card);
              }
            }
          });
        }, {
          threshold: 0.4
        });
        cards.forEach(card => observer.observe(card));
      }

      cards.forEach(card => {
        card.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          card.classList.toggle('flipped');
        });
      });
    } catch (e) { }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else { render(); }

  // Re-render when datasets are updated from GAS
  try {
    document.addEventListener((window.DataAPI && window.DataAPI.EVENT) || 'data:updated', (ev) => {
      const ds = (window.AppConfig && window.AppConfig.datasets && window.AppConfig.datasets.about) || 'aboutContent';
      const keys = (ev && ev.detail && ev.detail.keys) || [];
      if (!keys.length || keys.includes(ds)) {
        render();
      }
    });
  } catch (e) { }
})();

