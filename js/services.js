(function () {
  function qs(s, r = document) { return r.querySelector(s); }
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
      <header class="text-center max-w-3xl mx-auto mb-12 scroll-reveal">
        <span class="ui-eyebrow text-[var(--primary)] font-black tracking-wider text-base md:text-lg">SERVICES</span>
        <h1 class="heading-display mt-3 font-black tracking-tight text-[var(--text-primary)]">${esc(data.title || '服務項目')}</h1>
        <p class="lead-text mt-4 text-[var(--text-secondary)] font-semibold text-lg md:text-xl">${esc(data.lead || '')}</p>
      </header>

      <div class="space-y-16 mb-16 scroll-reveal">
        ${items.map((item, i) => {
          const isEven = i % 2 === 1;
          const badgeBg = isEven ? 'bg-[#dfc8b8] text-[#4d2a23]' : 'bg-[#b9dca8] text-[#224419]';
          const cardBorder = isEven ? 'border-[#dfc8b8]' : 'border-[#b9dca8]';
          const imgBorder = isEven ? 'border-[#d2b6a0]' : 'border-[#a9c9a0]';
          const delay = (i * 0.15).toFixed(2);
          const detail = item.detail || item.content || item.desc;
          
          // Use alternating slide directions to slide from alternating sides
          const animClass = isEven ? 'reveal-right' : 'reveal-left';
          
          return `
            <article id="service-${i + 1}" class="service-alt-card scroll-reveal-child ${animClass} flex flex-col ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-12 p-6 md:p-10 rounded-3xl border-2 ${cardBorder} bg-white/40 dark:bg-black/20 backdrop-blur-md relative overflow-visible transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5" style="transition-delay: ${delay}s">
              <!-- Text Area -->
              <div class="flex-1 z-10">
                <div class="flex items-center gap-3 mb-4">
                  <span class="inline-flex items-center justify-center w-10 h-10 rounded-lg ${badgeBg} font-mono font-black text-lg shadow-sm">
                    ${String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 class="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-wide">${esc(item.title)}</h2>
                </div>
                
                <p class="text-[var(--text-primary)] font-bold leading-relaxed mb-4 text-lg md:text-xl">
                  ${esc(item.desc)}
                </p>
                
                <div class="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <span class="text-base md:text-lg font-black text-[var(--primary)] block mb-1">內容：</span>
                  <p class="text-[var(--text-secondary)] leading-relaxed text-base md:text-lg font-medium">
                    ${esc(detail)}
                  </p>
                </div>
              </div>

              <!-- Image Area -->
              <div class="w-60 h-60 md:w-72 md:h-72 shrink-0 rounded-full overflow-hidden border-[8px] ${imgBorder} shadow-lg relative z-20 group">
                ${item.image ? `<img decoding="async" src="${esc(item.image)}" alt="${esc(item.title)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>

      <!-- Achievements Section -->
      <div id="achievements-placeholder"></div>

      <section class="service-gallery-full mt-16 scroll-reveal" aria-label="服務照片輪播">
        <div class="service-gallery-track">
          ${gallery.concat(gallery).map((src, i) => `<img decoding="async" src="${esc(src)}" alt="服務照片 ${i + 1}" loading="lazy">`).join('')}
        </div>
      </section>
    `;

    if (window.renderAchievements) {
      window.renderAchievements('achievements-placeholder', {
        achievementsTitle: data.achievementsTitle || about.achievementsTitle,
        achievements: achievements
      });
    }

    // Smooth scroll to hash anchor on page load
    scrollToHash();

    // Initialize scroll animations
    initScrollReveal();
  }

  function initScrollReveal() {
    const root = qs('#services-root');
    if (!root) return;

    // Elements to animate
    const animElements = root.querySelectorAll('.scroll-reveal');
    
    if ('IntersectionObserver' in window) {
      const observerOptions = {
        root: null,
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.15
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      }, observerOptions);

      // Use a brief timeout to let the browser register and paint the initial state (opacity: 0)
      setTimeout(() => {
        animElements.forEach(el => observer.observe(el));
      }, 50);
    } else {
      animElements.forEach(el => el.classList.add('revealed'));
    }
  }

  function scrollToHash() {
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        setTimeout(() => {
          const yOffset = -90;
          const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          target.classList.add('swap-highlight');
          setTimeout(() => target.classList.remove('swap-highlight'), 1200);
        }, 200);
      }
    }
  }

  window.addEventListener('hashchange', scrollToHash);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
