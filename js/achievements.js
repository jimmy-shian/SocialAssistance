(function () {
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
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

  function initAchievementsCountUp(container) {
    const numbers = container.querySelectorAll('.achievement-number');
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
      numbers.forEach(num => {
        num.textContent = num.dataset.to;
      });
    }
  }

  window.renderAchievements = function (containerId, data) {
    const container = document.getElementById(containerId);
    if (!container || !data) return;

    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    const title = data.achievementsTitle || '成就經歷';

    container.innerHTML = `
      <!-- Achievements Section (Styled like Services Page items) -->
      <section class="mt-12 mb-12">
        <div class="text-center mb-10">
          <h2 class="section-title inline-block relative z-10">${esc(title)}</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="achievements-grid">
          ${achievements.map((a, idx) => {
            const row = achievementText(a);
            const parsed = parseAchievement(row.text);
            const isEven = idx % 2 === 1;
            const cardBorder = isEven ? 'border-[#dfc8b8]' : 'border-[#b9dca8]';
            const cardInner = `
              <div class="text-5xl font-black text-[var(--primary)] mb-4 tracking-tight select-none">
                <span class="achievement-number" data-to="${parsed.num}">0</span><span class="text-3xl font-bold text-[var(--primary)]/90 ml-0.5">+</span>
              </div>
              <p class="text-[var(--text-secondary)] text-sm md:text-base font-semibold leading-relaxed">
                ${esc(parsed.prefix)}<strong class="text-[var(--text-primary)] font-black mx-0.5">${parsed.num}</strong>${esc(parsed.suffix)}
              </p>
            `;
            const cardClasses = `rounded-3xl border-2 ${cardBorder} bg-white/40 dark:bg-black/20 backdrop-blur-md p-6 md:p-8 text-center shadow-md hover:shadow-xl hover:scale-105 hover:-translate-y-1.5 transition-all duration-300`;
            return row.href
              ? `<a href="${esc(row.href)}" target="_blank" rel="noopener" class="block ${cardClasses} no-underline cursor-pointer">${cardInner}</a>`
              : `<div class="${cardClasses}">${cardInner}</div>`;
          }).join('')}
        </div>
      </section>
    `;

    initAchievementsCountUp(container);
  };
})();
