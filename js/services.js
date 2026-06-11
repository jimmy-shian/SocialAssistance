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

  const serviceDetailContent = {
    "體驗教育": "引導孩子參與各類低空、高空探索活動及團隊建立任務，學習溝通協調、問題解決與團隊共識，並透過反思引導建立內在自信。",
    "自立培育": "開辦自立生活技能工作坊，包含日常收支管理、簡易烹飪、情緒管理與人際關係整理，協助孩子做好成年自立的全面準備。",
    "職業探索": "串接在地友善職人與店家，提供多元職場參訪、一日職業體驗及做中學機會，幫助青少年了解產業現況與技能需求。",
    "生涯規劃": "透過一對一的諮詢與團體引導，協助青少年釐清生涯方向，訂定學習計畫與行動路徑，陪伴其實現短中長期成長目標。",
    "親子互動": "設計親子攀樹、木作共創等戶外與手作體驗，營造安全的對話情境，改善溝通模式，增進家庭成員間的情感連結與默契。",
    "冒險挑戰": "提供攀樹、野外探索等高感官、高張力的挑戰情境，在專業安全的引導下，帶領青少年走出舒適圈，體驗挑戰自我的勇氣。",
    "寒暑營隊": "利用假期舉辦密集的探索與成長營隊，結合戶外挑戰、生涯工作坊與職人交流，為孩子提供全面且深刻的假期學習體驗。"
  };

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

      <div class="space-y-16 mb-16">
        ${items.map((item, i) => {
          const isEven = i % 2 === 1;
          const badgeBg = isEven ? 'bg-[#dfc8b8] text-[#4d2a23]' : 'bg-[#b9dca8] text-[#224419]';
          const cardBorder = isEven ? 'border-[#dfc8b8]' : 'border-[#b9dca8]';
          const imgBorder = isEven ? 'border-[#d2b6a0]' : 'border-[#a9c9a0]';
          const delay = (i * 0.05).toFixed(2);
          const detail = serviceDetailContent[item.title] || item.content || item.desc;
          
          return `
            <article id="service-${i + 1}" class="service-alt-card flex flex-col ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-12 p-6 md:p-10 rounded-3xl border-2 ${cardBorder} bg-white/40 dark:bg-black/20 backdrop-blur-md relative overflow-visible transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5" style="animation-delay:${delay}s">
              <!-- Text Area -->
              <div class="flex-1 z-10">
                <div class="flex items-center gap-3 mb-4">
                  <span class="inline-flex items-center justify-center w-10 h-10 rounded-lg ${badgeBg} font-mono font-bold text-lg shadow-sm">
                    ${String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 class="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)]">${esc(item.title)}</h2>
                </div>
                
                <p class="text-[var(--text-primary)] font-semibold leading-relaxed mb-4 text-base md:text-lg">
                  ${esc(item.desc)}
                </p>
                
                <div class="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <span class="text-sm font-bold text-[var(--primary)] block mb-1">內容：</span>
                  <p class="text-[var(--text-secondary)] leading-relaxed text-sm md:text-base">
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

    // Smooth scroll to hash anchor on page load
    scrollToHash();
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
