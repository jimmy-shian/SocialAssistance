/**
 * 404 Sliding Puzzle Game
 * - Click a tile adjacent to the empty slot to swap
 * - No free-form dragging, just click-to-swap
 */
document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('puzzle-board');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const winOverlay = document.getElementById('win-overlay');

    // Config
    const size = 3;
    const totalTiles = size * size;
    const tileSize = 100;
    const gap = 2;
    const puzzleImage = './img/puzzle-404.png';

    // State: tiles[slot] = tile number (0 = empty)
    let tiles = [];
    let tileElements = {};

    initGame();

    shuffleBtn.addEventListener('click', resetGame);

    function initGame() {
        // Initial: 1,2,3,4,5,6,7,8,0
        tiles = Array.from({ length: totalTiles }, (_, i) => i === totalTiles - 1 ? 0 : i + 1);

        // Shuffle until solvable
        do {
            shuffleArray(tiles);
        } while (!isSolvable(tiles));

        createTiles();
        updateBoard();
    }

    function resetGame() {
        winOverlay.style.display = 'none';
        winOverlay.classList.remove('show');
        board.classList.remove('solved');

        do {
            shuffleArray(tiles);
        } while (!isSolvable(tiles));

        updateBoard();
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

    function createTiles() {
        board.innerHTML = '';
        tileElements = {};

        // Create tiles 1-8
        for (let num = 1; num < totalTiles; num++) {
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

            // Click handler
            tile.addEventListener('click', () => handleTileClick(num));

            // Press feedback
            tile.addEventListener('mousedown', () => tile.classList.add('pressed'));
            tile.addEventListener('mouseup', () => tile.classList.remove('pressed'));
            tile.addEventListener('mouseleave', () => tile.classList.remove('pressed'));
            tile.addEventListener('touchstart', () => tile.classList.add('pressed'), { passive: true });
            tile.addEventListener('touchend', () => tile.classList.remove('pressed'));

            board.appendChild(tile);
            tileElements[num] = tile;
        }
    }

    function updateBoard() {
        const emptySlot = tiles.indexOf(0);

        // Update each tile position and movable state
        for (let slot = 0; slot < totalTiles; slot++) {
            const num = tiles[slot];
            if (num === 0) continue;

            const tile = tileElements[num];
            if (!tile) continue;

            // Calculate position
            const row = Math.floor(slot / size);
            const col = slot % size;
            const x = col * (tileSize + gap) + gap;
            const y = row * (tileSize + gap) + gap;

            tile.style.transform = `translate(${x}px, ${y}px)`;
            tile.style.setProperty('--tile-transform', `translate(${x}px, ${y}px)`);

            // Mark if movable (adjacent to empty)
            if (isAdjacent(slot, emptySlot)) {
                tile.classList.add('movable');
            } else {
                tile.classList.remove('movable');
            }
        }

        // Check win after animation
        setTimeout(checkWin, 250);
    }

    function handleTileClick(num) {
        const currentSlot = tiles.indexOf(num);
        const emptySlot = tiles.indexOf(0);

        if (isAdjacent(currentSlot, emptySlot)) {
            // Swap
            tiles[emptySlot] = num;
            tiles[currentSlot] = 0;
            updateBoard();
        }
    }

    function isAdjacent(slot1, slot2) {
        const row1 = Math.floor(slot1 / size);
        const col1 = slot1 % size;
        const row2 = Math.floor(slot2 / size);
        const col2 = slot2 % size;
        return (Math.abs(row1 - row2) + Math.abs(col1 - col2)) === 1;
    }

    function checkWin() {
        const isWin = tiles.every((val, idx) => {
            if (idx === totalTiles - 1) return val === 0;
            return val === idx + 1;
        });

        if (isWin) {
            board.classList.add('solved');
            setTimeout(() => {
                winOverlay.style.display = 'flex';
                requestAnimationFrame(() => {
                    winOverlay.classList.add('show');
                    triggerConfetti();
                });
            }, 300);
        }
    }

    function triggerConfetti() {
        const colors = ['#6B8E23', '#9ACD32', '#ADFF2F', '#FFD700', '#FF6347', '#87CEEB'];
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
