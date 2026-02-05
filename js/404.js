/**
 * 404 Puzzle Game - Dual Mode
 * - Mobile: Click-to-swap sliding puzzle
 * - Desktop: Drag-and-drop jigsaw puzzle (Free positioning)
 */
document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('puzzle-board');
    const container = document.getElementById('puzzle-container');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const winOverlay = document.getElementById('win-overlay');

    // Config
    const size = 3;
    const totalTiles = size * size;
    const tileSize = 100;
    const gap = 2;
    const puzzleImage = './img/puzzle-404.png';

    // State
    let tiles = [];
    let tileElements = {};
    let isDesktopMode = window.innerWidth >= 768;
    let moveCount = 0;
    let startTime = null;
    let zIndexCounter = 10; // For stacking order of scattered pieces

    // Initialize game based on screen size
    initGame();

    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const wasDesktop = isDesktopMode;
            isDesktopMode = window.innerWidth >= 768;
            if (wasDesktop !== isDesktopMode) {
                initGame();
            }
        }, 250);
    });

    shuffleBtn.addEventListener('click', resetGame);

    function initGame() {
        moveCount = 0;
        startTime = Date.now();

        // Initial: 1,2,3,4,5,6,7,8,0
        tiles = Array.from({ length: totalTiles }, (_, i) => i === totalTiles - 1 ? 0 : i + 1);

        // Shuffle until solvable
        do {
            shuffleArray(tiles);
        } while (!isSolvable(tiles));

        if (isDesktopMode) {
            initJigsawMode();
        } else {
            initSlidingMode();
        }
    }

    function resetGame() {
        winOverlay.style.display = 'none';
        winOverlay.classList.remove('show');
        board.classList.remove('solved');
        moveCount = 0;
        startTime = Date.now();

        do {
            shuffleArray(tiles);
        } while (!isSolvable(tiles));

        if (isDesktopMode) {
            initJigsawMode();
        } else {
            updateSlidingBoard();
        }
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function isSolvable(arr) {
        let inversions = 0;
        const testArr = arr.filter(n => n !== 0);
        for (let i = 0; i < testArr.length; i++) {
            for (let j = i + 1; j < testArr.length; j++) {
                if (testArr[i] > testArr[j]) inversions++;
            }
        }
        return inversions % 2 === 0;
    }

    // =========================================
    // Mobile Mode: Sliding Puzzle
    // =========================================
    function initSlidingMode() {
        board.classList.remove('jigsaw-mode');
        board.innerHTML = '';
        tileElements = {};

        // Remove scattered pieces container if exists
        const scattered = document.getElementById('scattered-pieces');
        if (scattered) scattered.remove();

        // Create tiles 1-8
        for (let num = 1; num < totalTiles; num++) {
            const tile = createTileElement(num);
            tile.addEventListener('click', () => handleSlidingClick(num));
            // Add slight press effect but NO drag behavior for sliding mode
            addPressEffect(tile);
            board.appendChild(tile);
            tileElements[num] = tile;
        }

        updateSlidingBoard();
    }

    function createTileElement(num) {
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';
        tile.dataset.number = num;

        // Original position for background
        const origRow = Math.floor((num - 1) / size);
        const origCol = (num - 1) % size;

        tile.style.backgroundImage = `url('${puzzleImage}')`;
        tile.style.backgroundPosition = `-${origCol * tileSize}px -${origRow * tileSize}px`;

        // Jigsaw edges based on original position
        if (origCol < size - 1) tile.classList.add('has-tab-right');
        if (origRow < size - 1) tile.classList.add('has-tab-bottom');

        // Number indicator
        const numSpan = document.createElement('span');
        numSpan.className = 'tile-number';
        numSpan.textContent = num;
        tile.appendChild(numSpan);

        return tile;
    }

    function addPressEffect(tile) {
        tile.addEventListener('mousedown', () => tile.classList.add('pressed'));
        tile.addEventListener('mouseup', () => tile.classList.remove('pressed'));
        tile.addEventListener('mouseleave', () => tile.classList.remove('pressed'));
        tile.addEventListener('touchstart', () => tile.classList.add('pressed'), { passive: true });
        tile.addEventListener('touchend', () => tile.classList.remove('pressed'));
    }

    function updateSlidingBoard() {
        const emptySlot = tiles.indexOf(0);

        for (let slot = 0; slot < totalTiles; slot++) {
            const num = tiles[slot];
            if (num === 0) continue;

            const tile = tileElements[num];
            if (!tile) continue;

            const row = Math.floor(slot / size);
            const col = slot % size;
            const x = col * (tileSize + gap) + gap;
            const y = row * (tileSize + gap) + gap;

            tile.style.transform = `translate(${x}px, ${y}px)`;
            tile.style.setProperty('--tile-transform', `translate(${x}px, ${y}px)`);

            if (isAdjacent(slot, emptySlot)) {
                tile.classList.add('movable');
            } else {
                tile.classList.remove('movable');
            }
        }

        setTimeout(checkWin, 250);
    }

    function handleSlidingClick(num) {
        const currentSlot = tiles.indexOf(num);
        const emptySlot = tiles.indexOf(0);

        if (isAdjacent(currentSlot, emptySlot)) {
            tiles[emptySlot] = num;
            tiles[currentSlot] = 0;
            moveCount++;
            updateSlidingBoard();
        }
    }

    function isAdjacent(slot1, slot2) {
        const row1 = Math.floor(slot1 / size);
        const col1 = slot1 % size;
        const row2 = Math.floor(slot2 / size);
        const col2 = slot2 % size;
        return (Math.abs(row1 - row2) + Math.abs(col1 - col2)) === 1;
    }

    // =========================================
    // Desktop Mode: Jigsaw Drag & Drop (Free Positioning)
    // =========================================
    function initJigsawMode() {
        board.classList.add('jigsaw-mode');
        board.innerHTML = '';
        tileElements = {};

        // Track placed tiles (slot -> tileNum, null if empty)
        const placedTiles = Array(totalTiles).fill(null);

        // Create drop slots on the board
        for (let slot = 0; slot < totalTiles; slot++) {
            const dropSlot = document.createElement('div');
            dropSlot.className = 'drop-slot';
            dropSlot.dataset.slot = slot;

            const row = Math.floor(slot / size);
            const col = slot % size;
            const x = col * (tileSize + gap) + gap;
            const y = row * (tileSize + gap) + gap;
            dropSlot.style.left = `${x}px`;
            dropSlot.style.top = `${y}px`;

            board.appendChild(dropSlot);
        }

        // Create or get scattered pieces container
        let scatteredContainer = document.getElementById('scattered-pieces');
        if (!scatteredContainer) {
            scatteredContainer = document.createElement('div');
            scatteredContainer.id = 'scattered-pieces';

            // Wrap board and scattered in a flex container
            const gameWrapper = document.createElement('div');
            gameWrapper.className = 'puzzle-game-desktop';

            container.insertBefore(gameWrapper, board);
            gameWrapper.appendChild(scatteredContainer);
            gameWrapper.appendChild(board);
        } else {
            scatteredContainer.innerHTML = '';
        }

        // Create tiles and scatter them
        for (let num = 1; num < totalTiles; num++) {
            const tile = createTileElement(num);
            tile.classList.add('draggable');
            // Disable native drag (we use pointer events)
            tile.draggable = false;
            tile.style.touchAction = 'none'; // Prevent scrolling

            // Random position within scattered container
            const randomX = Math.random() * 200 + 20;
            const randomY = Math.random() * 200 + 20;
            const randomRotate = (Math.random() - 0.5) * 20;
            tile.style.position = 'absolute';
            tile.style.left = `${randomX}px`;
            tile.style.top = `${randomY}px`;
            tile.style.transform = `rotate(${randomRotate}deg)`;

            // Unified Pointer Events for free dragging
            setupPointerDrag(tile, num, placedTiles);

            scatteredContainer.appendChild(tile);
            tileElements[num] = tile;
        }
    }

    function setupPointerDrag(tile, tileNum, placedTiles) {
        let isDragging = false;
        let startX, startY;     // Pointer stats at 'down'
        let initialLeft, initialTop; // Element start position

        // Attach to pointerdown
        tile.onpointerdown = function (e) {
            // Only left mouse button or touch
            if (e.button !== 0) return;
            // If already placed, ignore
            if (tile.classList.contains('placed')) return;

            e.preventDefault(); // Prevent text selection etc.
            tile.setPointerCapture(e.pointerId);

            isDragging = true;
            tile.classList.add('dragging');
            tile.style.zIndex = '1000'; // Bring to front

            startX = e.clientX;
            startY = e.clientY;

            // Get current left/top (relative to parent)
            // Note: tile is 'absolute' positioned.
            // Using offsetLeft/Top is safest if no transforms interfering with flow, 
            // but we have random rotation transform!
            // However, we set left/top explicitly.
            initialLeft = parseFloat(tile.style.left || 0);
            initialTop = parseFloat(tile.style.top || 0);
        };

        tile.onpointermove = function (e) {
            if (!isDragging) return;
            e.preventDefault();

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            tile.style.left = `${initialLeft + dx}px`;
            tile.style.top = `${initialTop + dy}px`;

            // Simple hit detection for drop slots visual feedback
            checkDropTarget(e.clientX, e.clientY);
        };

        tile.onpointerup = function (e) {
            if (!isDragging) return;
            isDragging = false;
            tile.classList.remove('dragging');

            // Keep tile on top by incrementing z-index
            zIndexCounter++;
            tile.style.zIndex = zIndexCounter;

            tile.releasePointerCapture(e.pointerId);

            // Bounds Check
            const tileRect = tile.getBoundingClientRect();
            const tileCenter = {
                x: tileRect.left + tileRect.width / 2,
                y: tileRect.top + tileRect.height / 2
            };

            // Attempt to drop
            const droppedSlot = getDropTarget(e.clientX, e.clientY);
            let dropSuccess = false;

            if (droppedSlot !== null) {
                // Try to place into slot
                dropSuccess = handleDrop(tileNum, droppedSlot, placedTiles);
            } else {
                // Check if inside scattered area
                const scatteredContainer = document.getElementById('scattered-pieces');
                if (scatteredContainer) {
                    const scatteredRect = scatteredContainer.getBoundingClientRect();
                    if (isInside(tileCenter, scatteredRect)) {
                        dropSuccess = true; // Valid free drop
                    }
                }
            }

            // If invalid drop (outside both), revert
            if (!dropSuccess) {
                revertPosition(tile, initialLeft, initialTop);
            }

            // Clean up highlights
            clearDropHighlights();
        };

        // Cancel if lost capture
        tile.onpointercancel = function (e) {
            if (isDragging) {
                isDragging = false;
                tile.classList.remove('dragging');
                tile.style.zIndex = '';
            }
        };
    }

    function checkDropTarget(x, y) {
        // Highlight slots if hovering
        const dropSlots = document.querySelectorAll('.drop-slot');
        dropSlots.forEach(slot => {
            const rect = slot.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                slot.classList.add('drag-over');
            } else {
                slot.classList.remove('drag-over');
            }
        });
    }

    function getDropTarget(x, y) {
        const dropSlots = document.querySelectorAll('.drop-slot');
        let found = null;
        dropSlots.forEach(slot => {
            const rect = slot.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                found = parseInt(slot.dataset.slot);
            }
        });
        return found;
    }

    function clearDropHighlights() {
        const dropSlots = document.querySelectorAll('.drop-slot');
        dropSlots.forEach(slot => slot.classList.remove('drag-over'));
    }

    function handleDrop(tileNum, targetSlot, placedTiles) {
        const tile = tileElements[tileNum];
        if (!tile) return false;

        // Check if slot is already occupied
        if (placedTiles[targetSlot] !== null) {
            // Occupied: Do the "wrong position" shake
            tile.classList.add('wrong-position');
            setTimeout(() => tile.classList.remove('wrong-position'), 400);
            return false;
        }

        // Check if this is the correct slot
        const correctSlot = tileNum - 1;
        moveCount++;

        if (targetSlot === correctSlot) {
            // Correct placement!
            placedTiles[targetSlot] = tileNum;

            // Move tile from scattered container to board container
            // Calculate relative position within board
            const row = Math.floor(targetSlot / size);
            const col = targetSlot % size;
            const x = col * (tileSize + gap) + gap;
            const y = row * (tileSize + gap) + gap;

            tile.classList.add('placed');
            tile.classList.remove('draggable');

            // Re-parenting: Move DOM element to board
            board.appendChild(tile);

            tile.style.position = 'absolute';
            tile.style.left = `${x}px`;
            tile.style.top = `${y}px`;
            tile.style.transform = 'none';

            // Disable pointer events for this tile
            tile.onpointerdown = null;

            // Mark drop slot as occupied
            const dropSlot = board.querySelector(`.drop-slot[data-slot="${targetSlot}"]`);
            if (dropSlot) dropSlot.classList.add('occupied');

            // Check for win
            const placedCount = placedTiles.filter(t => t !== null).length;
            if (placedCount === totalTiles - 1) {
                setTimeout(handleWin, 300);
            }
            return true;
        } else {
            // Wrong position (not the correct slot for this piece)
            tile.classList.add('wrong-position');
            setTimeout(() => tile.classList.remove('wrong-position'), 400);
            return false;
        }
    }

    // Helper: Boundary Check
    function isInside(point, rect) {
        return point.x >= rect.left && point.x <= rect.right &&
            point.y >= rect.top && point.y <= rect.bottom;
    }

    // Helper: Revert Position
    function revertPosition(tile, left, top) {
        tile.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        tile.style.left = `${left}px`;
        tile.style.top = `${top}px`;
        setTimeout(() => {
            tile.style.transition = '';
        }, 300);
    }

    // =========================================
    // Win Condition
    // =========================================
    function checkWin() {
        if (isDesktopMode) return; // Desktop uses handleWin directly

        const isWin = tiles.every((val, idx) => {
            if (idx === totalTiles - 1) return val === 0;
            return val === idx + 1;
        });

        if (isWin) {
            handleWin();
        }
    }

    function handleWin() {
        board.classList.add('solved');

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const stars = calculateStars(moveCount, elapsed);

        setTimeout(() => {
            updateWinOverlay(stars, moveCount, elapsed);
            winOverlay.style.display = 'flex';
            requestAnimationFrame(() => {
                winOverlay.classList.add('show');
                triggerConfetti();
            });
        }, 300);
    }

    function calculateStars(moves, seconds) {
        const optimalMoves = isDesktopMode ? 8 : 20;

        if (moves <= optimalMoves && seconds < 60) return 3;
        if (moves <= optimalMoves * 2 && seconds < 120) return 2;
        return 1;
    }

    function updateWinOverlay(stars, moves, seconds) {
        let starsContainer = winOverlay.querySelector('.completion-stars');
        let statsContainer = winOverlay.querySelector('.completion-stats');

        if (!starsContainer) {
            const content = winOverlay.querySelector('.text-center');
            if (content) {
                starsContainer = document.createElement('div');
                starsContainer.className = 'completion-stars';
                content.insertBefore(starsContainer, content.firstChild);

                statsContainer = document.createElement('p');
                statsContainer.className = 'completion-stats text-white/80 text-sm mb-2';
                content.insertBefore(statsContainer, content.querySelector('a'));
            }
        }

        if (starsContainer) {
            starsContainer.innerHTML = '';
            for (let i = 1; i <= 3; i++) {
                const star = document.createElement('span');
                star.className = `star ${i <= stars ? 'earned' : ''}`;
                star.textContent = '⭐';
                star.style.animationDelay = `${i * 0.15}s`;
                starsContainer.appendChild(star);
            }
        }

        if (statsContainer) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            const timeStr = mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
            statsContainer.textContent = `移動次數: ${moves} | 用時: ${timeStr}`;
        }
    }

    function triggerConfetti() {
        const colors = ['#6B8E23', '#9ACD32', '#ADFF2F', '#FFD700', '#FF6347', '#87CEEB'];
        // ... simple confetti logic
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = `${Math.random() * 1.5}s`;
            confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
            confetti.style.width = `${6 + Math.random() * 8}px`;
            confetti.style.height = `${6 + Math.random() * 8}px`;
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 4500);
        }
    }
});
