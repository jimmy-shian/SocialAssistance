(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const section = document.querySelector(".services-tape-section");
    const stackContainer = document.getElementById("services-tape-stack");

    const titleEl = document.querySelector("#serviceTapeTitle");
    const textEl = document.querySelector("#serviceTapeText");
    const currentEl = document.querySelector("#serviceTapeCurrent");
    const totalEl = document.querySelector("#serviceTapeTotal");
    const progressEl = document.querySelector("#serviceTapeProgress");

    if (!section || !stackContainer) {
      return;
    }

    // 從 servicesContent.js 取得資料
    const data = window.servicesContent;
    if (!data || !Array.isArray(data.items)) {
      return;
    }

    // 動態生成卡片 HTML
    function esc(s) {
      return String(s || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
    }

    stackContainer.innerHTML = data.items.map(function (item, i) {
      return `
        <article class="service-tape-card" data-index="${i}">
          <!-- 原代碼: <img decoding="async" src="${esc(item.image)}" alt="${esc(item.title)}" class="service-card-img" loading="lazy"> -->
          <figure class="image-frame image-frame--card w-full h-full">
            <img decoding="async" src="${esc(item.image)}" alt="${esc(item.title)}" class="service-card-img" loading="lazy">
          </figure>
          <div class="service-bubble">
            <div class="service-icon-float"><i class="fas fa-star"></i></div>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.desc)}</p>
          </div>
        </article>
      `;
    }).join('');

    const cards = Array.from(document.querySelectorAll(".service-tape-card"));

    const servicesData = cards.map(function (card) {
      const title = card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "";
      const text = card.querySelector("p") ? card.querySelector("p").textContent.trim() : "";
      return {
        title: title,
        text: text
      };
    });

    let activeIndex = 0;
    let ticking = false;

    if (totalEl) {
      totalEl.textContent = String(cards.length).padStart(2, "0");
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function updateText(index) {
      if (index === activeIndex) {
        return;
      }

      activeIndex = index;

      if (titleEl) {
        titleEl.textContent = servicesData[index].title;
      }

      if (textEl) {
        textEl.textContent = servicesData[index].text;
      }

      if (currentEl) {
        currentEl.textContent = String(index + 1).padStart(2, "0");
      }
    }

    function updateCards() {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      /*
        sectionProgress:
        0   = 剛進入 sticky 區
        1   = 即將離開 sticky 區
      */
      const scrollableDistance = section.offsetHeight - viewportHeight;
      const rawProgress = -rect.top / scrollableDistance;
      const sectionProgress = clamp(rawProgress, 0, 1);

      const maxIndex = cards.length - 1;
      const exactIndex = sectionProgress * maxIndex;
      const currentIndex = Math.round(exactIndex);

      updateText(currentIndex);

      if (progressEl) {
        progressEl.style.width = sectionProgress * 100 + "%";
      }

      cards.forEach(function (card, index) {
        const distance = index - exactIndex;

        /*
          distance < 0：已經被換過去的卡
          distance = 0：目前主卡
          distance > 0：還沒輪到的卡
        */

        let translateX = 0;
        let translateY = 0;
        let scale = 1;
        let rotate = 0;
        let opacity = 1;
        let blur = 0;
        let zIndex = 100 - Math.abs(Math.round(distance * 10));

        if (distance < -0.65) {
          /*
            已經滑走的卡片：
            往左上退出，像錄影帶被抽走
          */
          translateX = -120;
          translateY = -80;
          scale = 0.86;
          rotate = -8;
          opacity = 0;
          blur = 3;
          zIndex = 1;
        } else if (distance < 0) {
          /*
            正在離場的卡片
          */
          const leaveProgress = Math.abs(distance);

          translateX = -120 * leaveProgress;
          translateY = -80 * leaveProgress;
          scale = 1 - 0.14 * leaveProgress;
          rotate = -8 * leaveProgress;
          opacity = 1 - leaveProgress;
          blur = 3 * leaveProgress;
          zIndex = 80;
        } else {
          /*
            還沒輪到的卡片：
            疊在主卡後面，露出一點邊緣
          */
          const stackDepth = Math.min(distance, 4);

          translateX = stackDepth * 18;
          translateY = stackDepth * 18;
          scale = 1 - stackDepth * 0.045;
          rotate = stackDepth * 2.2;
          opacity = 1 - stackDepth * 0.12;
          blur = stackDepth * 0.35;
          zIndex = 70 - index;
        }

        card.style.zIndex = zIndex;
        card.style.opacity = opacity;
        card.style.filter = "blur(" + blur + "px)";
        card.style.transform = "translate3d(" + translateX + "px, " + translateY + "px, 0) scale(" + scale + ") rotate(" + rotate + "deg)";
      });

      ticking = false;
    }

    function requestUpdate() {
      if (!ticking) {
        window.requestAnimationFrame(updateCards);
        ticking = true;
      }
    }

    // 初始執行一次
    updateCards();

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
  });
})();