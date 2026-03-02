# 🐍 贪吃蛇 · Snake Game

A web-based Snake game with user authentication, score tracking, and a real-time leaderboard — featuring a premium glassmorphism dark UI.

![Snake Game](https://img.shields.io/badge/Node.js-Express-green) ![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- 🔐 **User Auth** — Register / Login / Guest mode (bcrypt password hashing, session cookies)
- 🐍 **Snake Game** — Canvas-based, gradient snake body, glowing food, 10-speed levels
- 🏆 **Leaderboard** — Real-time Top 10, updates instantly after each game
- 💾 **Data Persistence** — JSON file storage (no database required)
- 🎨 **Premium UI** — Glassmorphism, animated glowing orbs, gradient text, Outfit font

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server (with hot-reload)
npm run dev
```

Then open **http://localhost:3000**

## 🗂 Project Structure

```
snake-game/
├── server/
│   ├── index.js          # Express entry point
│   ├── routes/
│   │   ├── auth.js       # Register / Login / Guest / Logout API
│   │   └── records.js    # Score submission & leaderboard API
│   └── data/
│       ├── users.json    # User data
│       └── records.json  # Game records
└── public/
    ├── index.html        # Login / Register page
    ├── game.html         # Game UI
    ├── css/style.css     # Global design system
    └── js/
        ├── auth.js       # Frontend auth logic
        ├── snake.js      # Game engine (Canvas)
        └── records.js    # Leaderboard & score submission
```

## 🎮 Controls

| Key | Action |
|-----|--------|
| `↑ ↓ ← →` / `W A S D` | Move snake |
| `Space` | Start / Pause |

Mobile: swipe to control direction.

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | HTML5 + Vanilla CSS + Vanilla JS |
| Backend | Node.js + Express |
| Auth | express-session + bcryptjs |
| Storage | JSON files |
| Font | Google Fonts · Outfit |
