/* =========================================================
   snake.js — 游戏核心逻辑（Canvas）
   ========================================================= */

const GRID = 25;   // px per cell — 20 cells × 25 = 500px canvas
const COLS = 20;
const ROWS = 20;

// Speed schedule: level → ms per tick (every 5pts = next level)
const SPEEDS = [160, 140, 120, 105, 90, 78, 68, 58, 50, 43];

function speedInfo(score) {
    const level = Math.min(Math.floor(score / 5), SPEEDS.length - 1);
    return { level: level + 1, ms: SPEEDS[level] };
}

/* ====================================================
   Game State (module-level so keydown / touch can set nextDir)
   ==================================================== */
let snake, dir, nextDir, food, score, startTime, elapsedSecs;
let isRunning = false, isPaused = false, isDead = false;
let ticker = null;
let foodPhase = 0;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

/* ── Draw helpers ─────────────────────────────────── */

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawBackground() {
    ctx.fillStyle = '#0d0d18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath(); ctx.moveTo(x * GRID, 0); ctx.lineTo(x * GRID, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * GRID); ctx.lineTo(canvas.width, y * GRID); ctx.stroke();
    }
}

function drawSnake() {
    const len = snake.length;

    snake.forEach((seg, i) => {
        const t = len > 1 ? i / (len - 1) : 0; // 0 = head, 1 = tail
        const alpha = 1 - t * 0.5;

        // Head purple→blue, tail darker
        const rv = Math.round(167 - t * 90);
        const gv = Math.round(139 - t * 60);
        const bv = Math.round(250 - t * 80);

        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(${rv},${gv},${bv},${alpha})`;

        const pad = 2;
        const sz = GRID - pad * 2;
        roundRect(seg.x * GRID + pad, seg.y * GRID + pad, sz, sz, i === 0 ? 5 : 3);
        ctx.fill();

        if (i === 0) {
            // Head glow
            ctx.shadowColor = '#a78bfa';
            ctx.shadowBlur = 12;
            ctx.fillStyle = 'rgba(167,139,250,0.35)';
            roundRect(seg.x * GRID + pad, seg.y * GRID + pad, sz, sz, 5);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Eyes
            drawEyes(seg);
        }
    });
}

function drawEyes(head) {
    const cx = head.x * GRID + GRID / 2;
    const cy = head.y * GRID + GRID / 2;
    const eyeMap = {
        right: [[4, -3], [4, 3]],
        left: [[-4, -3], [-4, 3]],
        up: [[-3, -4], [3, -4]],
        down: [[-3, 4], [3, 4]],
    };
    ctx.fillStyle = '#ffffff';
    (eyeMap[dir] || eyeMap.right).forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawFood() {
    foodPhase = (foodPhase + 0.05) % (Math.PI * 2);
    const pulse = 0.85 + Math.sin(foodPhase) * 0.15;

    const fx = food.x * GRID + GRID / 2;
    const fy = food.y * GRID + GRID / 2;
    const r = 6 * pulse;

    // Outer glow
    const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, GRID * 0.9 * pulse);
    grd.addColorStop(0, 'rgba(244,114,182,0.55)');
    grd.addColorStop(0.5, 'rgba(244,114,182,0.18)');
    grd.addColorStop(1, 'rgba(244,114,182,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(fx, fy, GRID * 0.9 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Sphere
    const inner = ctx.createRadialGradient(fx - 1.5, fy - 1.5, 0, fx, fy, r);
    inner.addColorStop(0, '#fce7f3');
    inner.addColorStop(0.5, '#f472b6');
    inner.addColorStop(1, '#be185d');
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
}

function drawPauseOverlay() {
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f0f0f5';
    ctx.font = '700 22px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⏸ 已暂停 — 按 SPACE 继续', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
}

function render() {
    drawBackground();
    drawSnake();
    drawFood();
    if (isPaused) drawPauseOverlay();
}

/* ── Game Logic ─────────────────────────────────────── */

function spawnFood() {
    const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
    let f;
    do { f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
    while (occupied.has(`${f.x},${f.y}`));
    food = f;
}

const DIR_OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const DIR_VEC = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

function updateHUD() {
    const now = Date.now();
    if (isRunning && !isPaused) {
        elapsedSecs = Math.floor((now - startTime) / 1000);
    }
    const mins = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
    const secs = String(elapsedSecs % 60).padStart(2, '0');
    document.getElementById('score-display').textContent = score;
    document.getElementById('time-display').textContent = `${mins}:${secs}`;

    const { level } = speedInfo(score);
    const icons = ['🟢', '🟢', '🟡', '🟠', '🔴', '🔴', '🔴', '🔴', '🔴', '🔴'];
    document.getElementById('level-display').textContent = `${icons[level - 1]} 等级 ${level}`;
}

function tick() {
    if (!isRunning || isPaused || isDead) return;

    // Apply buffered input direction
    if (nextDir && nextDir !== DIR_OPPOSITE[dir]) dir = nextDir;

    const dv = DIR_VEC[dir];
    const head = { x: snake[0].x + dv.x, y: snake[0].y + dv.y };

    // Collisions
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
        snake.some(s => s.x === head.x && s.y === head.y)) {
        triggerGameOver();
        return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        spawnFood();
    } else {
        snake.pop();
    }

    render();
    updateHUD();

    clearTimeout(ticker);
    ticker = setTimeout(tick, speedInfo(score).ms);
}

function triggerGameOver() {
    isDead = false;
    isRunning = false;
    clearTimeout(ticker);

    // Final elapsed
    elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
    updateHUD();

    const mins = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
    const secs = String(elapsedSecs % 60).padStart(2, '0');

    document.getElementById('pause-btn').disabled = true;
    document.getElementById('restart-btn').disabled = false;

    // Populate modal
    document.getElementById('go-score').textContent = score;
    document.getElementById('go-time').textContent = `${mins}:${secs}`;
    document.getElementById('go-length').textContent = snake.length;
    document.getElementById('go-level').textContent = speedInfo(score).level;

    const msgs = ['别灰心，再来一次！', '不错的尝试！', '很厉害！', '高手进阶中！', '无可匹敌！'];
    const lvl = speedInfo(score).level;
    document.getElementById('go-subtitle').textContent = msgs[Math.min(lvl - 1, msgs.length - 1)];

    const saveEl = document.getElementById('go-save-msg');
    saveEl.className = 'msg msg-info show';
    saveEl.textContent = '💾 正在保存记录…';

    document.getElementById('game-over-modal').classList.add('show');

    // Submit to server
    recordsManager.submit(score, elapsedSecs);
}

function resetState() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = 'right';
    nextDir = 'right';
    score = 0;
    elapsedSecs = 0;
    startTime = Date.now();
    isDead = false;
    foodPhase = 0;
    spawnFood();
}

/* ── Public Game Controller ─────────────────────────── */

const gameController = {
    start() {
        if (isRunning) return;
        resetState();
        isRunning = true;
        isPaused = false;
        document.getElementById('start-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
        document.getElementById('restart-btn').disabled = false;
        document.getElementById('pause-btn').textContent = '⏸ 暂停';
        tick();
    },

    togglePause() {
        if (!isRunning) return;
        isPaused = !isPaused;
        if (isPaused) {
            clearTimeout(ticker);
            render();
            document.getElementById('pause-btn').textContent = '▶ 继续';
        } else {
            startTime = Date.now() - elapsedSecs * 1000;
            document.getElementById('pause-btn').textContent = '⏸ 暂停';
            tick();
        }
    },

    restart() {
        clearTimeout(ticker);
        document.getElementById('game-over-modal').classList.remove('show');
        document.getElementById('pause-btn').textContent = '⏸ 暂停';
        document.getElementById('start-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
        document.getElementById('restart-btn').disabled = false;
        resetState();
        isRunning = true;
        isPaused = false;
        tick();
    },
};

/* ── Keyboard ──────────────────────────────────────── */
const KEY_MAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
};

document.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        e.preventDefault();
        if (!isRunning && !isPaused) { gameController.start(); return; }
        gameController.togglePause();
        return;
    }
    const d = KEY_MAP[e.key];
    if (!d) return;
    e.preventDefault();
    if (d !== DIR_OPPOSITE[dir]) nextDir = d;
});

/* ── Touch / Swipe ─────────────────────────────────── */
let touchX = 0, touchY = 0;
canvas.addEventListener('touchstart', (e) => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    const d = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
    if (d !== DIR_OPPOSITE[dir]) nextDir = d;
}, { passive: true });

/* ── Initial Screen ────────────────────────────────── */
(function drawStartScreen() {
    drawBackground();
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#a78bfa';
    ctx.font = '700 36px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐍 贪吃蛇', canvas.width / 2, canvas.height / 2 - 24);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(240,240,245,0.45)';
    ctx.font = '400 15px "Outfit", sans-serif';
    ctx.fillText('按「开始」或 SPACE 键开始游戏', canvas.width / 2, canvas.height / 2 + 24);
    ctx.textAlign = 'left';
})();
