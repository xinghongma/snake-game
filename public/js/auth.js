/* =========================================================
   auth.js — 前端登录 / 注册 / 游客逻辑
   ========================================================= */

function switchTab(tab) {
    const loginBtn = document.getElementById('tab-login-btn');
    const registerBtn = document.getElementById('tab-register-btn');
    const loginPanel = document.getElementById('panel-login');
    const regPanel = document.getElementById('panel-register');

    if (tab === 'login') {
        loginBtn.classList.add('active');
        registerBtn.classList.remove('active');
        loginPanel.classList.add('active');
        regPanel.classList.remove('active');
    } else {
        registerBtn.classList.add('active');
        loginBtn.classList.remove('active');
        regPanel.classList.add('active');
        loginPanel.classList.remove('active');
    }
}

function showMsg(id, text, type = 'error') {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = `msg msg-${type} show`;
}

function clearMsg(id) {
    const el = document.getElementById(id);
    el.className = 'msg';
    el.textContent = '';
}

/* ── 修复：统一按钮状态管理 ── */
function setBtnLoading(btnId, loading, originalText) {
    const btn = document.getElementById(btnId);
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.innerHTML = '<span class="spinner"></span>';
    } else {
        btn.disabled = false;
        btn.textContent = originalText || btn.dataset.originalText || '提交';
    }
}

async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    clearMsg('login-msg');

    if (!username || !password) {
        showMsg('login-msg', '请填写用户名和密码');
        return;
    }

    setBtnLoading('login-btn', true);
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!res.ok) {
            showMsg('login-msg', data.error || '登录失败，请重试');
            setBtnLoading('login-btn', false, '登入游戏');
        } else {
            showMsg('login-msg', '✓ 登录成功，跳转中…', 'success');
            // ✅ 修复：直接跳转，不走 setTimeout 避免意外中断
            window.location.replace('/game.html');
        }
    } catch {
        showMsg('login-msg', '网络错误，请检查连接');
        setBtnLoading('login-btn', false, '登入游戏');
    }
}

async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    clearMsg('register-msg');

    if (!username || !password || !confirm) {
        showMsg('register-msg', '请填写所有字段');
        return;
    }
    if (username.length < 2 || username.length > 20) {
        showMsg('register-msg', '用户名长度需在 2–20 个字符之间');
        return;
    }
    if (password.length < 6) {
        showMsg('register-msg', '密码至少 6 位');
        return;
    }
    if (password !== confirm) {
        showMsg('register-msg', '两次密码不一致');
        return;
    }

    setBtnLoading('register-btn', true);
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!res.ok) {
            showMsg('register-msg', data.error || '注册失败，请重试');
            setBtnLoading('register-btn', false, '创建账号');
        } else {
            showMsg('register-msg', '✓ 注册成功，跳转中…', 'success');
            // ✅ 修复：用 replace 跳转，避免 setTimeout 被其他逻辑干扰
            window.location.replace('/game.html');
        }
    } catch {
        showMsg('register-msg', '网络错误，请检查连接');
        setBtnLoading('register-btn', false, '创建账号');
    }
}

async function handleGuest() {
    const btn = document.getElementById('guest-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> 生成游客 ID…';

    try {
        const res = await fetch('/api/auth/guest', { method: 'POST' });
        if (res.ok) {
            window.location.replace('/game.html');
        } else {
            btn.disabled = false;
            btn.textContent = '👤 以游客身份游玩';
        }
    } catch {
        btn.disabled = false;
        btn.textContent = '👤 以游客身份游玩';
    }
}

// Allow Enter key to submit
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const loginPanel = document.getElementById('panel-login');
    if (loginPanel.classList.contains('active')) {
        handleLogin();
    } else {
        handleRegister();
    }
});

// If already logged in, redirect immediately
(async () => {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) window.location.replace('/game.html');
    } catch { /* not logged in */ }
})();
