const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '../data/users.json');

function readUsers() {
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 2 || username.length > 20) {
        return res.status(400).json({ error: '用户名长度需在 2-20 个字符之间' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: '密码至少 6 位' });
    }

    const users = readUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(409).json({ error: '用户名已存在' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
        id: uuidv4(),
        username,
        passwordHash,
        isGuest: false,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    req.session.userId = newUser.id;
    req.session.username = newUser.username;
    req.session.isGuest = false;
    req.session.loginAt = new Date().toISOString();

    res.json({ success: true, username: newUser.username, isGuest: false });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const users = readUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && !u.isGuest);
    if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.isGuest = false;
    req.session.loginAt = new Date().toISOString();

    res.json({ success: true, username: user.username, isGuest: false });
});

// POST /api/auth/guest
router.post('/guest', (req, res) => {
    const guestCode = String(Math.floor(100000 + Math.random() * 900000));
    const users = readUsers();

    const guestUser = {
        id: uuidv4(),
        username: guestCode,
        passwordHash: null,
        isGuest: true,
        createdAt: new Date().toISOString()
    };

    users.push(guestUser);
    writeUsers(users);

    req.session.userId = guestUser.id;
    req.session.username = guestCode;
    req.session.isGuest = true;
    req.session.loginAt = new Date().toISOString();

    res.json({ success: true, username: guestCode, isGuest: true });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '未登录' });
    }
    res.json({
        userId: req.session.userId,
        username: req.session.username,
        isGuest: req.session.isGuest,
        loginAt: req.session.loginAt
    });
});

module.exports = router;
