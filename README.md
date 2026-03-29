# Focus Mode

A wartime study companion for university students in Israel.

**Live Demo:** focus-mode-seven.vercel.app

---

## About

Israeli students don't get to put their studies on hold when sirens go off. Focus Mode is a Pomodoro-style study timer designed for exactly that reality — a calm, grounding tool that helps students stay focused between alerts, and recover quickly after them.

When a siren sounds, students can pause their session and open an AI companion chat that checks in on how they're doing, helps them feel safe, and gently guides them back to their work when they're ready. The AI remembers the full conversation across multiple siren events in the same session, so it always knows the context.

---

## Features

- Customizable study and break timers in 5-minute increments
- Task list with checkbox tracking during study sessions
- Circular countdown ring — amber during study, blue during break
- Automatic break screen when study ends; returns to setup when break ends
- **Siren button** — pauses the session and opens an AI companion chat
- AI remembers the full conversation across multiple siren events per session
- Guided re-entry flow: AI confirms you're safe, asks what you were working on, then reveals a green Resume button
- Warm, minimal design built for calm and focus

---

## Tech Stack

- React + Vite
- Groq API for ultra-fast LLM inference
- Llama 4 Scout (`meta-llama/llama-4-scout-17b-16e-instruct`)
