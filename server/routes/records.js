const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const RECORDS_FILE = path.join(__dirname, '../data/records.json');

function readRecords() {
    try {
        return JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function writeRecords(records) {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2));
}

// Auth guard middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: '请先登录' });
    }
    next();
}

// POST /api/records — save a game record
router.post('/', requireAuth, (req, res) => {
    const { score, duration } = req.body;
    if (score === undefined || duration === undefined) {
        return res.status(400).json({ error: '缺少 score 或 duration' });
    }

    const records = readRecords();
    const newRecord = {
        id: uuidv4(),
        userId: req.session.userId,
        username: req.session.username,
        isGuest: req.session.isGuest || false,
        score: Number(score),
        duration: Number(duration),
        loginAt: req.session.loginAt,
        playedAt: new Date().toISOString()
    };

    records.push(newRecord);
    writeRecords(records);

    res.json({ success: true, record: newRecord });
});

// GET /api/records/me — current user's records
router.get('/me', requireAuth, (req, res) => {
    const records = readRecords();
    const myRecords = records
        .filter(r => r.userId === req.session.userId)
        .sort((a, b) => b.score - a.score);
    res.json(myRecords);
});

// GET /api/records/leaderboard — global top 10
router.get('/leaderboard', (req, res) => {
    const records = readRecords();

    // Best score per user
    const bestByUser = {};
    records.forEach(r => {
        if (!bestByUser[r.userId] || r.score > bestByUser[r.userId].score) {
            bestByUser[r.userId] = r;
        }
    });

    const leaderboard = Object.values(bestByUser)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((r, idx) => ({
            rank: idx + 1,
            username: r.username,
            isGuest: r.isGuest,
            score: r.score,
            duration: r.duration,
            playedAt: r.playedAt
        }));

    res.json(leaderboard);
});

module.exports = router;
