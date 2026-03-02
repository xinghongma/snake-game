/* =========================================================
   records.js — 分数提交 & 排行榜逻辑
   ========================================================= */

const recordsManager = (() => {
    let currentUser = null;

    function formatTime(secs) {
        const m = String(Math.floor(secs / 60)).padStart(2, '0');
        const s = String(secs % 60).padStart(2, '0');
        return `${m}:${s}`;
    }

    async function init(user) {
        currentUser = user;
        await loadPersonalBest();
        await loadLeaderboard();
    }

    async function loadPersonalBest() {
        try {
            const res = await fetch('/api/records/me');
            if (!res.ok) return;
            const data = await res.json();
            if (data.length > 0) {
                document.getElementById('best-display').textContent = data[0].score;
            }
        } catch { /* ignore */ }
    }

    async function loadLeaderboard() {
        const container = document.getElementById('leaderboard-list');
        if (!container) return;
        try {
            const res = await fetch('/api/records/leaderboard');
            if (!res.ok) { container.innerHTML = '<p class="lb-empty">加载失败</p>'; return; }
            const data = await res.json();

            if (data.length === 0) {
                container.innerHTML = '<p class="lb-empty">暂无记录，快来创造第一条！</p>';
                return;
            }

            container.innerHTML = data.map((entry) => {
                const rankClass = entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : entry.rank === 3 ? 'bronze' : '';
                const rankEmoji = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
                const nameDisp = entry.isGuest ? `👤 ${entry.username}` : entry.username;
                const isMe = currentUser && entry.username === currentUser.username;

                return `
                <div class="lb-item${isMe ? ' lb-item-me' : ''}">
                    <span class="lb-rank ${rankClass}">${rankEmoji}</span>
                    <div class="lb-name-col">
                        <div class="lb-name">${nameDisp}${isMe ? ' <span class="lb-you">(你)</span>' : ''}</div>
                        <div class="lb-sub">${formatTime(entry.duration)}</div>
                    </div>
                    <span class="lb-score">${entry.score}</span>
                </div>`;
            }).join('');
        } catch {
            container.innerHTML = '<p class="lb-empty">加载失败，请刷新重试</p>';
        }
    }

    async function submit(score, duration) {
        const msgEl = document.getElementById('go-save-msg');
        try {
            const res = await fetch('/api/records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score, duration })
            });
            if (res.ok) {
                msgEl.className = 'msg msg-success show';
                msgEl.textContent = '✓ 记录已保存！';
                // 更新个人最高
                const bestEl = document.getElementById('best-display');
                const currentBest = parseInt(bestEl.textContent) || 0;
                if (score > currentBest) bestEl.textContent = score;
                // ✅ 修复：保存成功后立即刷新排行榜
                await loadLeaderboard();
            } else if (res.status === 401) {
                msgEl.className = 'msg msg-info show';
                msgEl.textContent = '💡 登录后可永久保存记录';
            } else {
                msgEl.className = 'msg msg-error show';
                msgEl.textContent = '保存失败，请检查网络';
            }
        } catch {
            msgEl.className = 'msg msg-error show';
            msgEl.textContent = '网络错误，记录未保存';
        }
    }

    return { init, submit, loadLeaderboard };
})();
