(function () {
  function qs(s, r = document) { return r.querySelector(s); }
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

      <!-- Achievements Section -->
      <div id="achievements-placeholder"></div>

      <section class="service-gallery-full mt-16" aria-label="服務照片輪播">
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
