/**
 * Interactive Holo Card Logic (Smoothed)
 * Uses Linear Interpolation (LERP) for fluid movement
 */

(function () {
    // Configuration
    const ROTATION_RANGE = 12; // Max rotation in degrees
    const LERP_FACTOR = 0.1;   // Smoothing factor (0.05 = very smooth/slow, 0.2 = responsive)

    // Map to store state for each card
    const cardStates = new WeakMap();

    function initHoloCard(card) {
        if (card.dataset.holoInitialized) return;

        // Initial state
        const state = {
            targetX: 50, // Percentage 0-100
            targetY: 50,
            currentX: 50,
            currentY: 50,
            width: 0,
            height: 0,
            left: 0,
            top: 0,
            isHovering: false,
            rafId: null
        };

        cardStates.set(card, state);

        // ResizeObserver to keep rect updated (better than calling getBoundingClientRect on move)
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const rect = entry.target.getBoundingClientRect();
                state.width = rect.width;
                state.height = rect.height;
                state.left = rect.left + window.scrollX;
                state.top = rect.top + window.scrollY;
            }
        });
        resizeObserver.observe(card);

        // Update rect on scroll/resize (fallback)
        function updateRect() {
            const rect = card.getBoundingClientRect();
            state.width = rect.width;
            state.height = rect.height;
            state.left = rect.left; // use client rect for mouse calculation compatibility
            state.top = rect.top;
        }

        card.addEventListener('mouseenter', () => {
            state.isHovering = true;
            updateRect();
            startAnimation(card, state);
        });

        card.addEventListener('mouseleave', () => {
            state.isHovering = false;
            // potential: stop animation after settling?
            // For now, set target back to center
            state.targetX = 50;
            state.targetY = 50;
        });

        card.addEventListener('mousemove', (e) => {
            if (!state.isHovering) return;

            // Calc position relative to card
            const x = e.clientX - state.left;
            const y = e.clientY - state.top;

            // Clamp 0-100
            state.targetX = Math.max(0, Math.min(100, (x / state.width) * 100));
            state.targetY = Math.max(0, Math.min(100, (y / state.height) * 100));
        });

        card.dataset.holoInitialized = 'true';
    }

    function startAnimation(card, state) {
        if (state.rafId) cancelAnimationFrame(state.rafId);

        function loop() {
            // Linear Interpolation
            const dx = state.targetX - state.currentX;
            const dy = state.targetY - state.currentY;

            // Stop if close enough (and not hovering, to save resources)
            if (!state.isHovering && Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
                state.currentX = 50;
                state.currentY = 50;
                updateCardStyle(card, 50, 50);
                state.rafId = null;
                return;
            }

            state.currentX += dx * LERP_FACTOR;
            state.currentY += dy * LERP_FACTOR;

            updateCardStyle(card, state.currentX, state.currentY);

            state.rafId = requestAnimationFrame(loop);
        }

        loop();
    }

    function updateCardStyle(card, px, py) {
        // Update CSS variables
        card.style.setProperty('--mx', `${px}%`);
        card.style.setProperty('--my', `${py}%`);

        // Calculate Rotation
        const rx = -((py - 50) / 50) * ROTATION_RANGE;
        const ry = ((px - 50) / 50) * ROTATION_RANGE;

        card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    }

    function initAll() {
        document.querySelectorAll('.holo-card').forEach(initHoloCard);
    }

    // Observer for new cards
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('holo-card')) {
                        initHoloCard(node);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll('.holo-card').forEach(initHoloCard);
                    }
                }
            });
        });
    });

    // Global scroll listener to update rects (simple version)
    window.addEventListener('scroll', () => {
        // Optional: only update active cards if needed
        // For simplicity, just relying on mouseenter's updateRect or simple recalc in mousemove if needed
        // But our optimized approach relies on cached rects. 
        // Let's rely on getBoundingClientRect in mousemove if we really want 100% accuracy,
        // but for speed, we use cached.
        // Actually, let's revert to getBoundingClientRect in mousemove for simplicity/robustness vs scrolling
        // and just LERP the visualization. This prevents scroll desync bugs.
    }, { passive: true });

    // REVISED init for standard robustness:
    // We will just LERP. MouseMove calculates target. Loop interpolates current.

    function initHoloCardSimple(card) {
        if (card.dataset.holoInitialized) return;

        let targetX = 50, targetY = 50;
        let currentX = 50, currentY = 50;
        let rafId = null;
        let isHovering = false;

        function animate() {
            const dx = targetX - currentX;
            const dy = targetY - currentY;

            currentX += dx * 0.1; // Smooth factor
            currentY += dy * 0.1;

            // Apply
            updateCardStyle(card, currentX, currentY);

            if (isHovering || Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                rafId = requestAnimationFrame(animate);
            } else {
                rafId = null;
            }
        }

        card.addEventListener('mouseenter', () => {
            isHovering = true;
            if (!rafId) animate();
        });

        card.addEventListener('mouseleave', () => {
            isHovering = false;
            targetX = 50;
            targetY = 50;
            if (!rafId) animate();
        });

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            targetX = Math.max(0, Math.min(100, (x / rect.width) * 100));
            targetY = Math.max(0, Math.min(100, (y / rect.height) * 100));

            if (!rafId) animate();
        });

        card.dataset.holoInitialized = 'true';
    }

    // Overwrite the previous complex Init with Simple
    initAll = function () {
        document.querySelectorAll('.holo-card').forEach(initHoloCardSimple);
    }

    // Bind
    document.addEventListener('DOMContentLoaded', () => {
        initAll();
        observer.observe(document.body, { childList: true, subtree: true });
    });

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initAll();
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
