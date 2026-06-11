(function () {
  function qs(s, r = document) { return r.querySelector(s); }
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  
  function achievementText(item) {
    if (typeof item === 'string') return { text: item, href: '' };
    return { text: item && (item.text || item.title) || '', href: item && item.href || '' };
  }

  function parseAchievement(str) {
    const match = str.match(/(\d+)/);
    if (!match) return { num: 0, prefix: '', suffix: str };
    const num = parseInt(match[1], 10);
    const index = match.index;
    const prefix = str.slice(0, index);
    const suffix = str.slice(index + match[1].length);
    return { num, prefix, suffix };
  }

  function animateCount(el, target) {
    const duration = 1600; // 1.6 seconds animation duration
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      
      // Easing function: easeOutExpo (starts fast, decelerates to a precise stop)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentVal = Math.round(target * easeProgress);
      el.textContent = currentVal;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(tick);
  }

  function initAchievementsCountUp() {
    const numbers = document.querySelectorAll('.achievement-number');
    if (!numbers.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const targetVal = parseInt(el.dataset.to, 10) || 0;
            animateCount(el, targetVal);
            observer.unobserve(el);
          }
        });
      }, {
        threshold: 0.15
      });

      numbers.forEach(num => observer.observe(num));
    } else {
      // Fallback if IntersectionObserver not supported
      numbers.forEach(num => {
        num.textContent = num.dataset.to;
      });
    }
  }

  function render() {
    const root = qs('#services-root');
    if (!root) return;
    const data = window.servicesContent || {};
    const about = window.aboutContent || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const achievements = Array.isArray(data.achievements) ? data.achievements : (about.achievements || []);
    const gallery = Array.isArray(data.gallery) && data.gallery.length ? data.gallery : items.map(x => x.image).filter(Boolean);
    
    root.innerHTML = `
      <header class="text-center max-w-3xl mx-auto mb-12">
        <span class="ui-eyebrow text-[var(--primary)] font-bold tracking-wider">SERVICES</span>
        <h1 class="heading-display mt-3">${esc(data.title || '服務項目')}</h1>
        <p class="lead-text mt-4 text-[var(--text-secondary)]">${esc(data.lead || '')}</p>
      </header>

      <section class="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
        ${items.map((item, i) => {
          const spanMap = {0:'md:col-span-8',1:'md:col-span-4',2:'md:col-span-4',3:'md:col-span-8',4:'md:col-span-6',5:'md:col-span-3',6:'md:col-span-3'};
          const span = spanMap[i] || 'md:col-span-1';
          const delay = (i * 0.05).toFixed(2);
          return `
            <article class="service-feature-card glass-surface rounded-xl overflow-hidden ${span} transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-6 hover:scale-105 active:scale-97" style="animation-delay:${delay}s">
              <div class="service-feature-image image-frame image-frame--card">
                ${item.image ? `<img decoding="async" src="${esc(item.image)}" alt="${esc(item.title)}" loading="lazy">` : ''}
              </div>
              <div class="p-6">
                <div class="text-sm font-mono text-[var(--primary)] mb-2">${String(i + 1).padStart(2, '0')}</div>
                <h2 class="text-xl font-bold mb-3">${esc(item.title)}</h2>
                <p class="text-[var(--text-secondary)] leading-relaxed">${esc(item.desc)}</p>
              </div>
            </article>
          `;
        }).join('')}
      </section>

      <!-- Glassmorphism Achievement Section -->
      <section class="mt-16 glass-surface rounded-3xl p-8 md:p-12 border border-white/20 bg-white/5 dark:bg-black/10 backdrop-blur-md shadow-lg">
        <h2 class="heading-section text-center mb-10 text-2xl md:text-3xl font-extrabold tracking-tight">${esc(data.achievementsTitle || about.achievementsTitle || '成就經歷')}</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="achievements-container">
          ${achievements.map((a) => {
            const row = achievementText(a);
            const parsed = parseAchievement(row.text);
            const cardInner = `
              <div class="text-5xl font-black text-[var(--primary)] mb-4 tracking-tight select-none">
                <span class="achievement-number" data-to="${parsed.num}">0</span><span class="text-3xl font-bold text-[var(--primary)]/90 ml-0.5">+</span>
              </div>
              <p class="text-[var(--text-secondary)] text-sm md:text-base font-semibold leading-relaxed">
                ${esc(parsed.prefix)}<strong class="text-[var(--text-primary)] font-black mx-0.5">${parsed.num}</strong>${esc(parsed.suffix)}
              </p>
            `;
            return row.href
              ? `<a href="${esc(row.href)}" target="_blank" rel="noopener" class="achievement-glass-card block rounded-2xl p-6 md:p-8 text-center border border-white/30 dark:border-white/10 bg-gradient-to-br from-white/30 to-white/10 dark:from-white/10 dark:to-transparent backdrop-blur-xl shadow-md hover:shadow-xl hover:scale-105 hover:-translate-y-1.5 transition-all duration-300 no-underline cursor-pointer">${cardInner}</a>`
              : `<div class="achievement-glass-card rounded-2xl p-6 md:p-8 text-center border border-white/30 dark:border-white/10 bg-gradient-to-br from-white/30 to-white/10 dark:from-white/10 dark:to-transparent backdrop-blur-xl shadow-md hover:shadow-xl hover:scale-105 hover:-translate-y-1.5 transition-all duration-300">${cardInner}</div>`;
          }).join('')}
        </div>
      </section>

      <section class="service-gallery-full mt-16" aria-label="服務照片輪播">
        <div class="service-gallery-track">
          ${gallery.concat(gallery).map((src, i) => `<img decoding="async" src="${esc(src)}" alt="服務照片 ${i + 1}" loading="lazy">`).join('')}
        </div>
      </section>
    `;

    // Initialize the count up animations after elements are rendered in DOM
    initAchievementsCountUp();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
