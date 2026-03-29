import { useState, useEffect, useRef } from 'react';
import './App.css';

// Native fetch wrapper — avoids Groq SDK browser compatibility issues on Safari
async function groqChat(messages, maxTokens) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: maxTokens,
      messages,
    }),
  });
  const data = await res.json();
  return data.choices[0]?.message?.content || "I'm here with you.";
}

// Fix 1 & 3: static openers — no API call
const OPENER_FIRST =
  "🛡️ Get to a safe place — your session will be right here waiting for you. Let me know when you're back.";
const OPENER_REPEAT =
  "🛡️ Another siren — go, go! I'll be here. Come back when you're safe.";

// ─── Setup Screen ────────────────────────────────────────────────────────────

function TimeAdjuster({ label, value, onChange }) {
  return (
    <div className="time-adjuster">
      <span className="adjuster-label">{label}</span>
      <div className="adjuster-controls">
        <button
          className="adj-btn"
          onClick={() => onChange(Math.max(5, value - 5))}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="adj-value">{value} min</span>
        <button
          className="adj-btn"
          onClick={() => onChange(value + 5)}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function SetupScreen({ onBegin }) {
  const [studyMins, setStudyMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [tasks, setTasks] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);

  const addTask = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    setTasks((prev) => [...prev, { id: Date.now(), text: trimmed, done: false }]);
    setInputVal('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addTask();
  };

  const removeTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="screen setup-screen fade-up">
      <header className="setup-header">
        <h1 className="app-title">Focus Mode</h1>
        <p className="app-subtitle">A quiet space to study, even in noisy times.</p>
      </header>

      <section className="card">
        <h2 className="card-title">Session Settings</h2>
        <TimeAdjuster label="Study Time" value={studyMins} onChange={setStudyMins} />
        <TimeAdjuster label="Break Time" value={breakMins} onChange={setBreakMins} />
      </section>

      <section className="card">
        <h2 className="card-title">Today's Tasks</h2>
        <div className="task-input-row">
          <input
            ref={inputRef}
            className="task-input"
            type="text"
            placeholder="Add a task…"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="add-btn" onClick={addTask} aria-label="Add task">
            +
          </button>
        </div>
        {tasks.length > 0 && (
          <ul className="task-list">
            {tasks.map((t) => (
              <li key={t.id} className="task-item">
                <span className="task-text">{t.text}</span>
                <button
                  className="remove-btn"
                  onClick={() => removeTask(t.id)}
                  aria-label="Remove task"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {tasks.length === 0 && (
          <p className="empty-hint">Add at least one task to begin.</p>
        )}
      </section>

      <button
        className="begin-btn"
        disabled={tasks.length === 0}
        onClick={() =>
          onBegin({
            studyMins,
            breakMins,
            tasks: tasks.map((t) => ({ ...t, done: false })),
          })
        }
      >
        Begin Study Session
      </button>
    </div>
  );
}

// ─── Circular Ring Timer ──────────────────────────────────────────────────────

const RING_R = 80;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

function RingTimer({ secondsLeft, totalSeconds, mode }) {
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const dashoffset = RING_CIRCUMFERENCE * (1 - progress);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const ringColor = mode === 'study' ? '#c17f3a' : '#3a6fa8';

  return (
    <div className="ring-container">
      <svg className="ring-svg" width="200" height="200" viewBox="0 0 200 200">
        <circle
          cx="100" cy="100" r={RING_R}
          fill="none" stroke="#e8dfd0" strokeWidth="10"
        />
        <circle
          cx="100" cy="100" r={RING_R}
          fill="none"
          stroke={ringColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
        />
      </svg>
      <div className="ring-label">
        <span className="ring-time">{mins}:{secs}</span>
      </div>
    </div>
  );
}

// ─── Siren Modal ──────────────────────────────────────────────────────────────
// Fix 1, 2, 3, 4, 6

function SirenModal({ tasks, timeRemaining, sirenCount, fullChatHistory, onUpdateHistory, onResume }) {
  // Initialize with the correct static opener — no API call on mount
  const opener = sirenCount === 1 ? OPENER_FIRST : OPENER_REPEAT;
  const [visibleMessages, setVisibleMessages] = useState([
    { role: 'assistant', content: opener, isStatic: true },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const bottomRef = useRef(null);

  const doneTasks = tasks.filter((t) => t.done).map((t) => t.text);
  const pendingTasks = tasks.filter((t) => !t.done).map((t) => t.text);
  const minsLeft = Math.floor(timeRemaining / 60);

  // Fix 6: system prompt explicitly requires asking what they were working on
  const systemPrompt = `You are a warm, calm companion for a university student in Israel who is studying during wartime. A siren just went off and their session is paused. Help them feel grounded and safe, then ease them back into studying.

Session context:
- Tasks completed: ${doneTasks.length > 0 ? doneTasks.join(', ') : 'none yet'}
- Tasks still pending: ${pendingTasks.length > 0 ? pendingTasks.join(', ') : 'none'}
- Time remaining in study block: ~${minsLeft} minute${minsLeft !== 1 ? 's' : ''}

Conversation flow — follow this exactly:
1. When the user says they are back or safe, respond warmly that you're glad they're safe. Then you MUST ask them: "What were you working on just before the siren went off?" — ask this every time, no exceptions. You may rephrase it naturally but the meaning must be the same.
2. After the user answers what they were working on, give a gentle focused re-entry: acknowledge what they said, briefly reconnect them to their task, then end your message with the token [SHOW_RESUME].
3. Do NOT include [SHOW_RESUME] until AFTER the user has described what they were working on. Never skip asking. Never show [SHOW_RESUME] in the same message where you ask the question.

Additional guidelines:
- Speak with genuine warmth — this is hard and they're trying their best
- Keep messages concise — 2–4 sentences
- Remember everything shared in this entire conversation`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, loading]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    const newVisible = [...visibleMessages, userMsg];
    setVisibleMessages(newVisible);
    setInput('');
    setLoading(true);

    // API context: full history from all previous siren events + real (non-static) messages this event
    const realCurrent = newVisible
      .filter((m) => !m.isStatic)
      .map((m) => ({ role: m.role, content: m.content }));

    const apiMessages = [
      ...fullChatHistory.map((m) => ({ role: m.role, content: m.content })),
      ...realCurrent,
    ];

    try {
      const text = await groqChat(
        [{ role: 'system', content: systemPrompt }, ...apiMessages],
        400
      );
      const aiMsg = { role: 'assistant', content: text };
      setVisibleMessages([...newVisible, aiMsg]);
      // Accumulate real exchanges into full history for future siren events
      onUpdateHistory([
        ...fullChatHistory,
        ...realCurrent,
        { role: 'assistant', content: text },
      ]);
      if (text.includes('[SHOW_RESUME]')) setShowResume(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="siren-modal fade-up">
        <div className="modal-header">
          <span className="modal-icon">🚨</span>
          <h2 className="modal-title">Siren — Take a breath</h2>
        </div>

        <div className="chat-messages">
          {visibleMessages.map((msg, i) => {
            const isAI = msg.role === 'assistant';
            const visible = msg.content.replace('[SHOW_RESUME]', '').trim();
            return (
              <div key={i} className={`bubble-wrapper ${isAI ? 'ai' : 'user'}`}>
                <div className={`bubble ${isAI ? 'bubble-ai' : 'bubble-user'}`}>
                  {visible}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="bubble-wrapper ai">
              <div className="bubble bubble-ai typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {showResume && (
          <button className="resume-btn" onClick={onResume}>
            I&apos;m back — Resume
          </button>
        )}

        <div className="chat-input-row">
          <textarea
            className="chat-input"
            placeholder="Reply…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Session Screen ───────────────────────────────────────────────────────────

function SessionScreen({ config, onStop }) {
  const { studyMins, breakMins, tasks: initialTasks } = config;

  const [tasks, setTasks] = useState(initialTasks);
  const [mode, setMode] = useState('study');
  const [secondsLeft, setSecondsLeft] = useState(studyMins * 60);
  const [totalSeconds] = useState(studyMins * 60);
  const [breakTotal] = useState(breakMins * 60);
  const [paused, setPaused] = useState(false);
  const [showSiren, setShowSiren] = useState(false);
  const [sirenCount, setSirenCount] = useState(0);
  const [fullChatHistory, setFullChatHistory] = useState([]);
  const onStopRef = useRef(onStop);
  useEffect(() => { onStopRef.current = onStop; }, [onStop]);

  // Tick — just decrement, no transition logic here
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  // Transition when timer reaches 0 — safe to read mode/breakMins as state here
  useEffect(() => {
    if (secondsLeft !== 0) return;
    if (mode === 'study') {
      setMode('break');
      setSecondsLeft(breakMins * 60);
    } else if (mode === 'break') {
      onStopRef.current();
    }
  }, [secondsLeft, mode, breakMins]);

  const toggleTask = (id) => {
    if (mode !== 'study') return;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const openSiren = () => {
    setSirenCount((c) => c + 1);
    setPaused(true);
    setShowSiren(true);
  };

  const closeSiren = () => {
    setShowSiren(false);
    setPaused(false);
  };

  return (
    <div className="screen session-screen fade-up">
      {showSiren && (
        <SirenModal
          tasks={tasks}
          timeRemaining={secondsLeft}
          sirenCount={sirenCount}
          fullChatHistory={fullChatHistory}
          onUpdateHistory={setFullChatHistory}
          onResume={closeSiren}
        />
      )}

      <div className={`mode-pill ${mode}`}>
        {mode === 'study' ? '📖 Study' : '☕ Break'}
      </div>

      <RingTimer
        secondsLeft={secondsLeft}
        totalSeconds={mode === 'study' ? totalSeconds : breakTotal}
        mode={mode}
      />

      {/* Fix 5: calm break message */}
      {mode === 'break' && (
        <p className="break-message">Take a break — you&apos;ve earned it 🌿</p>
      )}

      <div className="session-actions">
        {mode === 'study' && (
          <button className="siren-btn" onClick={openSiren}>
            🚨 Siren! Pause Session
          </button>
        )}
        <button className="stop-btn" onClick={onStop}>
          Stop
        </button>
      </div>

      <section className="card task-session-card">
        <h2 className="card-title">Tasks</h2>
        <ul className="task-list">
          {tasks.map((t) => (
            <li key={t.id} className={`task-item ${t.done ? 'done' : ''}`}>
              <label className={`task-check-label ${mode === 'break' ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggleTask(t.id)}
                  disabled={mode === 'break'}
                />
                <span className="task-text">{t.text}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState('setup');
  const [sessionConfig, setSessionConfig] = useState(null);

  const handleBegin = (config) => {
    setSessionConfig(config);
    setScreen('session');
  };

  const handleStop = () => {
    setSessionConfig(null);
    setScreen('setup');
  };

  return (
    <div className="app">
      {screen === 'setup' && <SetupScreen onBegin={handleBegin} />}
      {screen === 'session' && sessionConfig && (
        <SessionScreen config={sessionConfig} onStop={handleStop} />
      )}
    </div>
  );
}
