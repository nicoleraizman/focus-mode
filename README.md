# Focus Mode

A wartime study focus tool for university students in Israel.

**Live Demo:** _coming soon_

---

## About

Focus Mode is a Pomodoro-style study timer built for students who need to concentrate even when air-raid sirens go off. When a siren sounds, students can pause their session and open an AI-powered chat companion — powered by Llama 4 via Groq — that checks in on how they're doing, helps them feel grounded, and gently guides them back to their work when they're ready.

---

## Features

- Customizable study and break timers (in 5-minute increments)
- Task list with checkbox tracking during study sessions
- Circular SVG countdown ring — amber during study, blue during break
- Automatic break screen when study timer ends; returns to setup when break ends
- **Siren button** — pauses the session and opens an AI companion chat
- AI companion remembers the full conversation across multiple siren events in the same session
- Guided re-entry flow: AI checks you're safe, asks what you were working on, then reveals a "Resume" button
- Warm, calm design built for focus and emotional safety

---

## Tech Stack

- [React](https://react.dev) + [Vite](https://vite.dev)
- [Groq API](https://console.groq.com) — ultra-fast inference
- [Llama 4 Scout](https://groq.com) (`meta-llama/llama-4-scout-17b-16e-instruct`)
- CSS (no UI library)

---

## Run Locally

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/focus-mode.git
   cd focus-mode
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a `.env` file** in the project root:
   ```
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```
   Get a free API key (no credit card) at [console.groq.com](https://console.groq.com).

4. **Start the dev server**
   ```bash
   npm run dev
   ```
   Then open [http://localhost:5173](http://localhost:5173).
