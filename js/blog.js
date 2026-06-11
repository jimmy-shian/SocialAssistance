(function () {
  const categoryLabels = {
    daily: '聽見日常',
    news: '重要通知',
    interview: '人物專訪',
    glory: '榮耀時刻'
  };

  const dailyGrid = document.getElementById('blog-daily-grid');
  const newsGrid = document.getElementById('blog-news-grid');
  const interviewGrid = document.getElementById('blog-interview-grid');

  const dailySection = document.getElementById('blog-daily-section');
  const newsSection = document.getElementById('blog-news-section');
  const interviewSection = document.getElementById('blog-interview-section');
  const glorySection = document.getElementById('blog-glory-section');

  const tabs = Array.from(document.querySelectorAll('.blog-tab'));

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function posts() {
    return (window.blogContent && Array.isArray(window.blogContent.posts)) ? window.blogContent.posts : [];
  }

  function renderTimeline(post) {
    const rows = Array.isArray(post.timeline) && post.timeline.length
      ? post.timeline
      : [{ time: post.date, title: post.title, detail: post.excerpt }];

    return `<div class="blog-timeline">${rows.map((row, index) => `
      <div class="blog-timeline-item" style="--step:${index}">
        <span>${esc(row.time)}</span>
        <strong>${esc(row.title)}</strong>
        <p>${esc(row.detail)}</p>
      </div>
    `).join('')}</div>`;
  }

  function renderStandardPost(post, index) {
    return `
      <article class="blog-post-card group cursor-pointer flex flex-col" role="button" tabindex="0" data-post-id="${esc(post.id)}" data-category="${esc(post.category)}">
        <div class="w-full aspect-square rounded-2xl overflow-hidden bg-[var(--bg-inset)] border border-[var(--border)] shadow-md transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-lg relative">
          <img decoding="async" src="${esc(post.image)}" alt="${esc(post.title)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
          <span class="blog-post-tag absolute right-3 bottom-3" data-category="${esc(post.category)}">${esc(categoryLabels[post.category] || post.category)}</span>
        </div>
        <div class="py-3 px-1">
          <h3 class="font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors text-sm md:text-base leading-snug">${esc(post.title)}</h3>
          <p class="text-[var(--text-muted)] text-xs mt-1">${esc(post.date)}</p>
        </div>
      </article>
    `;
  }

  function renderGloryPost(post, index) {
    return `
      <article class="blog-glory-feature" style="--stack:${index}" data-post-id="${esc(post.id)}" data-category="glory">
        <div class="blog-glory-media image-frame image-frame--banner">
          <img decoding="async" src="${esc(post.image)}" alt="${esc(post.title)}" loading="lazy">
          <span class="blog-post-tag" data-category="glory">${esc(categoryLabels.glory)}</span>
        </div>
        <div class="blog-glory-copy">
          <div class="blog-glory-eyebrow">Glory Timeline</div>
          <h3 class="blog-glory-title">${esc(post.title)}</h3>
          <p class="blog-glory-summary">${esc(post.excerpt || post.content || '')}</p>
          ${renderTimeline(post)}
        </div>
      </article>
    `;
  }

  let activeGloryParticleSystem = null;
  let gloryScrollHandler = null;

  class GloryParticleSystem {
    constructor(canvas, svgX) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.svgX = svgX;
      this.particles = [];
      this.mouseX = null;
      this.mouseY = null;
      this.scrollSpeed = 0;
      this.lastScrollY = window.scrollY;
      this.active = true;
      this.init();
    }
    init() {
      this.resize();
      this.resizeListener = () => this.resize();
      window.addEventListener('resize', this.resizeListener);

      const timelineCol = document.querySelector('.glory-timeline-col');
      if (timelineCol) {
        this.mousemoveListener = (e) => {
          const rect = this.canvas.getBoundingClientRect();
          this.mouseX = e.clientX - rect.left;
          this.mouseY = e.clientY - rect.top;
        };
        this.mouseleaveListener = () => {
          this.mouseX = null;
          this.mouseY = null;
        };
        timelineCol.addEventListener('mousemove', this.mousemoveListener);
        timelineCol.addEventListener('mouseleave', this.mouseleaveListener);
      }

      const count = Math.min(80, Math.floor(window.innerWidth / 12));
      for (let i = 0; i < count; i++) {
        this.particles.push(this.createParticle());
      }
      this.animate();
    }
    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      const svg = document.querySelector('.glory-timeline-col svg');
      if (svg) {
        this.svgX = svg.offsetLeft + svg.getBoundingClientRect().width / 2;
      } else {
        this.svgX = 40;
      }
    }
    createParticle(y = null, isBurst = false) {
      const startY = y !== null ? y : Math.random() * this.canvas.height;
      const side = Math.random() > 0.5 ? 1 : -1;
      const offset = 20 + Math.random() * 150;
      const startX = this.svgX + side * offset;
      return {
        x: startX,
        y: startY,
        baseX: startX,
        startX: startX,
        size: 1.2 + Math.random() * 2.5,
        alpha: 0.15 + Math.random() * 0.45,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: 0.01 + Math.random() * 0.02,
        amplitude: 15 + Math.random() * 35,
        vy: (0.15 + Math.random() * 0.35) * (Math.random() > 0.5 ? 1 : -1),
        vx: isBurst ? (Math.random() - 0.5) * 6 : 0,
        vyBurst: isBurst ? (Math.random() - 0.5) * 6 : 0,
        life: isBurst ? 1.0 : null,
        decay: isBurst ? 0.02 + Math.random() * 0.025 : null
      };
    }
    burst(x, y, count = 25) {
      for (let i = 0; i < count; i++) {
        const p = this.createParticle(y, true);
        p.x = x;
        p.y = y;
        this.particles.push(p);
      }
    }
    animate() {
      if (!this.active) return;
      requestAnimationFrame(() => this.animate());

      const currentScrollY = window.scrollY;
      const diff = Math.abs(currentScrollY - this.lastScrollY);
      this.scrollSpeed = this.scrollSpeed * 0.93 + diff * 0.07;
      this.lastScrollY = currentScrollY;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#5b8c65';

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        if (p.life !== null) {
          p.x += p.vx;
          p.y += p.vyBurst;
          p.life -= p.decay;
          if (p.life <= 0) {
            this.particles.splice(i, 1);
            continue;
          }
        } else {
          p.angle += p.angleSpeed;
          p.y += p.vy * (1 + this.scrollSpeed * 0.15);
          const scrollStrength = Math.min(1.0, this.scrollSpeed / 30.0);
          const targetX = p.startX + (this.svgX - p.startX) * scrollStrength * 0.85;
          p.baseX = p.baseX + (targetX - p.baseX) * 0.1;
          p.x = p.baseX + Math.sin(p.angle) * p.amplitude;
          if (p.y < 0) p.y = this.canvas.height;
          if (p.y > this.canvas.height) p.y = 0;
        }

        if (this.mouseX !== null && this.mouseY !== null) {
          const dx = this.mouseX - p.x;
          const dy = this.mouseY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const force = (120 - dist) / 120;
            p.x += (dx / dist) * force * 3.5;
            p.y += (dy / dist) * force * 3.5;
          }
        }

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = accentColor;
        this.ctx.globalAlpha = p.life !== null ? p.life : p.alpha;
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1.0;
    }
    destroy() {
      this.active = false;
      window.removeEventListener('resize', this.resizeListener);
      const timelineCol = document.querySelector('.glory-timeline-col');
      if (timelineCol) {
        timelineCol.removeEventListener('mousemove', this.mousemoveListener);
        timelineCol.removeEventListener('mouseleave', this.mouseleaveListener);
      }
    }
  }

  function renderGloryParallaxLayout(gloryPosts) {
    let allTimelineNodes = [];
    let allImages = [];
    gloryPosts.forEach(post => {
      const rows = Array.isArray(post.timeline) && post.timeline.length
        ? post.timeline
        : [{ time: post.date, title: post.title, detail: post.excerpt }];
      rows.forEach(row => {
        allTimelineNodes.push({
          time: row.time,
          title: row.title,
          detail: row.detail,
          postId: post.id
        });
      });
      if (Array.isArray(post.images) && post.images.length) {
        allImages.push(...post.images);
      } else if (post.image) {
        allImages.push(post.image);
      }
    });
    allImages = Array.from(new Set(allImages));
    if (!allImages.length) {
      allImages.push('./img/1000012016_6e6b5da647.webp');
    }

    glorySection.innerHTML = `
      <div class="text-center mb-8">
        <span class="text-sm text-[var(--primary)] font-semibold uppercase tracking-wider">GLORY TIMELINE</span>
        <h2 class="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mt-1">榮耀時刻</h2>
      </div>
      <div class="glory-parallax-container flex flex-col md:flex-row gap-8 relative py-8">
        <!-- 左側 Sticky 視覺固定欄 -->
        <div class="glory-sticky-col md:w-[35%] h-auto md:h-[calc(100vh-160px)] md:sticky md:top-28 flex flex-col items-center justify-center select-none z-20">
          <div class="glory-main-card relative overflow-hidden rounded-2xl shadow-xl w-full aspect-[4/3] md:aspect-square bg-gray-900 border border-[var(--border)] cursor-zoom-in">
            <img id="glory-sticky-img" src="${esc(allImages[0])}" alt="榮耀主視覺" class="w-full h-full object-cover transition-opacity duration-300 scale-100" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
            <span class="blog-post-tag absolute right-4 bottom-4 z-10" data-category="glory">榮耀時刻</span>
          </div>
          <!-- 縮圖導覽 -->
          <div id="glory-sticky-thumbs" class="flex justify-center gap-2 mt-4 overflow-x-auto w-full py-1">
            ${allImages.map((img, idx) => `
              <img src="${esc(img)}" alt="縮圖 ${idx+1}" class="glory-thumb w-12 h-12 object-cover rounded-lg border-2 border-transparent cursor-pointer hover:scale-105 transition-all duration-300 ${idx===0?'active border-[var(--primary)]':''}" data-index="${idx}">
            `).join('')}
          </div>
        </div>
        <!-- 右側 時間軸與粒子畫布 -->
        <div class="glory-timeline-col md:w-[65%] relative pl-12 md:pl-20 min-h-[80vh] pb-32">
          <canvas id="glory-particle-canvas" class="absolute inset-0 w-full h-full pointer-events-none z-0"></canvas>
          <svg class="absolute left-4 md:left-10 top-0 w-1 h-full z-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg" style="height: 100%;">
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--border)" stroke-width="2" stroke-dasharray="4 4" opacity="0.3"></line>
            <line id="glory-beam-line" x1="50%" y1="0" x2="50%" y2="0%" stroke="var(--primary)" stroke-width="3" stroke-linecap="round"></line>
          </svg>
          <div class="glory-nodes-container space-y-36 relative z-10 pt-8">
            ${allTimelineNodes.map((node, idx) => `
              <div class="glory-node-item relative opacity-0 transform translate-y-8 transition-all duration-700 ease-out" data-index="${idx}">
                <span class="glory-node-dot absolute -left-[39px] md:-left-[47px] top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-gray-900 bg-gray-300 dark:bg-gray-700 shadow-sm transition-all duration-500">
                  <span class="glory-node-ripple absolute inset-0 rounded-full bg-[var(--primary)]/40 scale-100 opacity-0"></span>
                </span>
                <div class="card-dynamic-bg p-6 rounded-2xl border border-[var(--border)] shadow-md hover:shadow-lg transition-all duration-300">
                  <div class="text-sm font-bold text-[var(--primary)] uppercase tracking-wider mb-1">${esc(node.time)}</div>
                  <h3 class="text-xl font-extrabold text-[var(--text-primary)] mb-2">${esc(node.title)}</h3>
                  <p class="text-[var(--text-secondary)] leading-relaxed text-sm md:text-base">${esc(node.detail)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    initGloryMotionEffects(allImages, allTimelineNodes);
  }

  function initGloryMotionEffects(allImages, allTimelineNodes) {
    const card = document.querySelector('.glory-main-card');
    const stickyImg = document.getElementById('glory-sticky-img');
    const thumbsContainer = document.getElementById('glory-sticky-thumbs');
    const canvas = document.getElementById('glory-particle-canvas');
    const beamLine = document.getElementById('glory-beam-line');
    const container = document.querySelector('.glory-parallax-container');
    const nodes = document.querySelectorAll('.glory-node-item');

    let currentImgIdx = 0;

    // 1. 圖片 Lightbox 與點擊切換
    if (stickyImg && window.Lightbox) {
      stickyImg.addEventListener('click', () => {
        window.Lightbox.ensureLightbox().open(currentImgIdx, allImages);
      });
    }

    function switchStickyImage(idx) {
      if (currentImgIdx === idx || idx < 0 || idx >= allImages.length) return;
      currentImgIdx = idx;
      const thumbs = document.querySelectorAll('.glory-thumb');
      thumbs.forEach((t, tIdx) => {
        if (tIdx === idx) {
          t.classList.add('active', 'border-[var(--primary)]');
          t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
          t.classList.remove('active', 'border-[var(--primary)]');
        }
      });
      if (stickyImg) {
        stickyImg.style.opacity = '0.3';
        setTimeout(() => {
          stickyImg.src = allImages[idx];
          stickyImg.style.opacity = '1';
        }, 150);
      }
    }

    if (thumbsContainer) {
      thumbsContainer.addEventListener('click', (e) => {
        const t = e.target.closest('.glory-thumb');
        if (!t) return;
        const idx = parseInt(t.dataset.index || '0', 10);
        switchStickyImage(idx);
      });
    }

    // 2. 3D Tilt
    if (card) {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        const dx = x - xc;
        const dy = y - yc;
        const tiltX = (dy / yc) * -8;
        const tiltY = (dx / xc) * 8;
        card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      });
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
      });
    }

    // 3. Canvas 粒子初始化
    let pSystem = null;
    if (canvas) {
      pSystem = new GloryParticleSystem(canvas, 40);
      activeGloryParticleSystem = pSystem;
    }

    // 4. Scroll-driven 動態
    gloryScrollHandler = () => {
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const viewHeight = window.innerHeight;

      // A. 左欄微幅縮放
      if (stickyImg) {
        const totalDist = containerRect.height + viewHeight;
        const progress = Math.min(1, Math.max(0, (viewHeight - containerRect.top) / totalDist));
        stickyImg.style.transform = `scale(${1.0 + progress * 0.05})`;
      }

      // B. SVG 光束繪製
      const timelineCol = document.querySelector('.glory-timeline-col');
      if (timelineCol && beamLine) {
        const rect = timelineCol.getBoundingClientRect();
        const startOffset = viewHeight * 0.75;
        const progress = Math.min(1.0, Math.max(0.0, (startOffset - rect.top) / (rect.height - viewHeight * 0.35)));
        beamLine.setAttribute('y2', `${progress * 100}%`);
      }

      // C. 年份節點激活、Ripple、粒子爆發、圖片切換
      nodes.forEach((node, idx) => {
        const rect = node.getBoundingClientRect();
        if (rect.top < viewHeight * 0.65) {
          if (!node.classList.contains('active')) {
            node.classList.add('active');
            const dot = node.querySelector('.glory-node-dot');
            if (dot) {
              dot.classList.remove('bg-gray-300', 'dark:bg-gray-700');
              dot.classList.add('bg-[var(--primary)]', 'border-[var(--primary)]');
              const ripple = dot.querySelector('.glory-node-ripple');
              if (ripple) {
                ripple.style.animation = 'glory-ripple 0.8s ease-out';
                ripple.addEventListener('animationend', () => { ripple.style.animation = ''; }, { once: true });
              }
            }
            if (pSystem && dot) {
              const dotRect = dot.getBoundingClientRect();
              const canvasRect = canvas.getBoundingClientRect();
              const burstX = dotRect.left - canvasRect.left + dotRect.width / 2;
              const burstY = dotRect.top - canvasRect.top + dotRect.height / 2;
              pSystem.burst(burstX, burstY, 30);
            }
            switchStickyImage(idx % allImages.length);
          }
        }
      });
    };

    window.addEventListener('scroll', gloryScrollHandler, { passive: true });
    requestAnimationFrame(gloryScrollHandler);
  }

  function renderPosts(category = 'all') {
    if (activeGloryParticleSystem) {
      activeGloryParticleSystem.destroy();
      activeGloryParticleSystem = null;
    }
    if (gloryScrollHandler) {
      window.removeEventListener('scroll', gloryScrollHandler);
      gloryScrollHandler = null;
    }

    const allPosts = posts();

    // Show/hide sections based on active category tab
    if (glorySection) glorySection.style.display = (category === 'all' || category === 'glory') ? '' : 'none';
    if (dailySection) dailySection.style.display = (category === 'all' || category === 'daily') ? '' : 'none';
    if (newsSection) newsSection.style.display = (category === 'all' || category === 'news') ? '' : 'none';
    if (interviewSection) interviewSection.style.display = (category === 'all' || category === 'interview') ? '' : 'none';

    // 1. Render Glory Section
    if (glorySection && (category === 'all' || category === 'glory')) {
      const gloryPosts = allPosts.filter(p => p.category === 'glory');
      if (gloryPosts.length) {
        if (category === 'glory') {
          renderGloryParallaxLayout(gloryPosts);
        } else {
          glorySection.innerHTML = `
            <div class="text-center mb-8">
              <span class="text-sm text-[var(--primary)] font-semibold uppercase tracking-wider">GLORY TIMELINE</span>
              <h2 class="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mt-1">榮耀時刻</h2>
            </div>
            <div class="blog-glory-stack">
              ${gloryPosts.map((post, index) => renderGloryPost(post, index)).join('')}
            </div>
          `;
        }
      } else {
        glorySection.style.display = 'none';
      }
    }

    // 2. Render Daily Section
    if (dailyGrid && (category === 'all' || category === 'daily')) {
      const dailyPosts = allPosts.filter(p => p.category === 'daily');
      dailyGrid.innerHTML = dailyPosts.map((post, index) => renderStandardPost(post, index)).join('');
    }

    // 3. Render News Section
    if (newsGrid && (category === 'all' || category === 'news')) {
      const newsPosts = allPosts.filter(p => p.category === 'news');
      newsGrid.innerHTML = newsPosts.map((post, index) => renderStandardPost(post, index)).join('');
    }

    // 4. Render Interview Section
    if (interviewGrid && (category === 'all' || category === 'interview')) {
      const interviewPosts = allPosts.filter(p => p.category === 'interview');
      interviewGrid.innerHTML = interviewPosts.map((post, index) => renderStandardPost(post, index)).join('');
    }
  }

  function ensureBlogModal() {
    let modal = document.getElementById('blog-lightbox-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'blog-lightbox-modal';
    modal.className = 'blog-lightbox-modal blog-spatial-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="blog-lightbox-backdrop" data-close-blog></div>
      <article class="blog-lightbox-panel" role="dialog" aria-modal="true" aria-labelledby="blog-modal-title">
        <button type="button" class="blog-lightbox-close" data-close-blog aria-label="關閉">×</button>
        <div class="blog-lightbox-body"></div>
      </article>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-blog]')) closeBlogModal(modal);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeBlogModal(modal);
    });

    return modal;
  }

  function closeBlogModal(modal = document.getElementById('blog-lightbox-modal')) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open', 'blog-spatial-open');
    document.querySelectorAll('.blog-post-card.is-opening').forEach(card => card.classList.remove('is-opening'));
  }

  function renderDailyGallery(images) {
    if (!Array.isArray(images) || !images.length) return '';
    return `
      <div class="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
        <h4 class="text-sm font-bold text-[var(--primary)] mb-3 tracking-wider">📷 活動照片花絮</h4>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          ${images.map(img => `
            <div class="aspect-[4/3] rounded-lg overflow-hidden border border-[var(--border)] cursor-zoom-in group">
              <img src="${esc(img)}" alt="活動照片" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 lightbox-trigger" loading="lazy">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderNewsCTA(post) {
    if (!post.link || post.link === './blog.html') return '';
    return `
      <div class="mt-8 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
        <a href="${esc(post.link)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] hover:shadow-lg hover:brightness-110 transition-all duration-300 transform hover:-translate-y-0.5 font-bold shadow-md">
          <i class="fas fa-file-alt"></i>
          👉 立即線上報名表單 👈
        </a>
      </div>
    `;
  }

  function renderInterviewContent(content) {
    if (!content) return '';
    const paragraphs = content.split('\n').map(p => p.trim()).filter(Boolean);
    return `
      <div class="interview-article space-y-4">
        ${paragraphs.map(p => {
          if (p.startsWith('Q:') || p.startsWith('問:')) {
            return `
              <div class="interview-q text-[var(--primary)] font-extrabold text-base md:text-lg mt-6 mb-2 flex items-start gap-2.5">
                <span class="bg-[var(--primary)] text-white text-xs font-black px-2 py-0.5 rounded-md mt-1 shrink-0">問</span>
                <span class="leading-snug">${esc(p.slice(2).trim())}</span>
              </div>`;
          } else if (p.startsWith('A:') || p.startsWith('答:')) {
            return `
              <div class="interview-a text-[var(--text-secondary)] pl-8 mb-4 leading-relaxed text-sm md:text-base border-l-2 border-gray-200 dark:border-gray-700">
                ${esc(p.slice(2).trim())}
              </div>`;
          }
          return `<p class="leading-relaxed text-[var(--text-secondary)] text-sm md:text-base pl-8">${esc(p)}</p>`;
        }).join('')}
      </div>
    `;
  }

  function openFullscreenImage(src) {
    let viewer = document.getElementById('blog-image-viewer');
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.id = 'blog-image-viewer';
      viewer.className = 'fixed inset-0 z-[1500] bg-black/90 flex items-center justify-center cursor-zoom-out opacity-0 transition-opacity duration-300';
      viewer.innerHTML = `
        <img src="" alt="大圖" class="max-w-[95vw] max-h-[95vh] object-contain rounded-md shadow-2xl transition-transform duration-300 scale-95" />
        <button class="absolute top-4 right-4 text-white text-3xl font-bold bg-black/45 w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors" aria-label="關閉">×</button>
      `;
      document.body.appendChild(viewer);
      viewer.addEventListener('click', () => {
        viewer.classList.remove('opacity-100');
        viewer.classList.add('opacity-0');
        setTimeout(() => { viewer.style.display = 'none'; }, 300);
      });
    }
    const img = viewer.querySelector('img');
    img.src = src;
    viewer.style.display = 'flex';
    requestAnimationFrame(() => {
      viewer.classList.remove('opacity-0');
      viewer.classList.add('opacity-100');
    });
  }

  function openPost(post, sourceCard) {
    const modal = ensureBlogModal();
    const body = modal.querySelector('.blog-lightbox-body');
    const label = categoryLabels[post.category] || post.category;

    let contentHtml = '';
    if (post.category === 'glory') {
      contentHtml = renderTimeline(post);
    } else if (post.category === 'daily') {
      contentHtml = `
        <p class="leading-relaxed text-[var(--text-secondary)] text-sm md:text-base mb-4">${esc(post.content || post.excerpt || '')}</p>
        ${renderDailyGallery(post.images)}
      `;
    } else if (post.category === 'news') {
      contentHtml = `
        <p class="leading-relaxed text-[var(--text-secondary)] text-sm md:text-base mb-4">${esc(post.content || post.excerpt || '')}</p>
        ${renderNewsCTA(post)}
      `;
    } else if (post.category === 'interview') {
      contentHtml = renderInterviewContent(post.content || post.excerpt || '');
    } else {
      contentHtml = `<p class="leading-relaxed text-[var(--text-secondary)] text-sm md:text-base">${esc(post.content || post.excerpt || '')}</p>`;
    }

    body.innerHTML = `
      <div class="blog-modal-hero mb-6">
        <img decoding="async" src="${esc(post.image)}" alt="${esc(post.title)}" class="w-full h-auto max-h-[350px] object-cover rounded-xl shadow-md">
      </div>
      <div class="blog-modal-meta text-xs uppercase font-bold tracking-wider text-[var(--primary)] mb-1">${esc(label)}</div>
      <h2 class="blog-modal-title text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] mb-2" id="blog-modal-title">${esc(post.title)}</h2>
      <p class="blog-modal-date text-xs text-[var(--text-muted)] mb-6">${esc(post.date)}</p>
      <div class="blog-modal-content border-t border-gray-100 dark:border-gray-800 pt-6">
        ${contentHtml}
      </div>
    `;

    // Bind click events on gallery items for full-screen zoom using global Lightbox
    const galleryImgs = body.querySelectorAll('.lightbox-trigger');
    galleryImgs.forEach((img, idx) => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.Lightbox) {
          window.Lightbox.ensureLightbox().open(idx, post.images);
        } else {
          openFullscreenImage(img.src);
        }
      });
    });

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    sourceCard?.classList.add('is-opening');
    document.body.classList.add('modal-open', 'blog-spatial-open');
    requestAnimationFrame(() => modal.querySelector('.blog-lightbox-close')?.focus({ preventScroll: true }));
  }

  function openFromCard(card) {
    const post = posts().find(item => String(item.id) === String(card.dataset.postId));
    if (post && post.category !== 'glory') openPost(post, card);
  }

  function init() {
    // Detect grid presence via any section grid
    if (!dailyGrid && !newsGrid && !interviewGrid) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(item => item.classList.remove('active'));
        tab.classList.add('active');
        renderPosts(tab.dataset.category || 'all');
      });
    });

    const grids = [dailyGrid, newsGrid, interviewGrid].filter(Boolean);
    grids.forEach(g => {
      g.addEventListener('click', (event) => {
        const card = event.target.closest('[data-post-id]');
        if (card) openFromCard(card);
      });

      g.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const card = event.target.closest('[data-post-id]');
        if (!card) return;
        event.preventDefault();
        openFromCard(card);
      });
    });

    // Also support clicking features in glory stack
    if (glorySection) {
      glorySection.addEventListener('click', (event) => {
        const feat = event.target.closest('.blog-glory-feature');
        if (feat) {
          const post = posts().find(item => String(item.id) === String(feat.dataset.postId));
          if (post) openPost(post, feat);
        }
      });
    }

    renderPosts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
