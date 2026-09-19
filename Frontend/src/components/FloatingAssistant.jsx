import { useMemo, useRef, useState } from "react";
import { askAssistant } from "../api/ai";
import "./FloatingAssistant.css";

const STARTER_QUESTIONS = [
  "How many publications are in this app?",
  "How many researchers are registered?",
  "Summarize current project records.",
];

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi. I can answer only about this Scientific Collaboration Network Analyzer application and its data.",
    },
  ]);
  const textareaRef = useRef(null);

  const canSend = useMemo(() => !loading && input.trim().length > 0, [loading, input]);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (!prev) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 60);
      }
      return next;
    });
  };

  const submitQuestion = async (questionText) => {
    const trimmed = (questionText || "").trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await askAssistant(trimmed);
      const answer = response?.data?.answer || "I can only answer questions related to this application.";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      setError(err.response?.data?.detail || "Assistant is unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitQuestion(input);
  };

  return (
    <>
      <button
        type="button"
        className={`floating-ai-trigger ${open ? "floating-ai-trigger--open" : ""}`}
        onClick={toggleOpen}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
      >
        <span className="floating-ai-trigger-icon">🤖</span>
      </button>

      <aside className={`floating-ai-panel ${open ? "floating-ai-panel--open" : ""}`} aria-hidden={!open}>
        <div className="floating-ai-header">
          <div>
            <p>AI Assistant</p>
            <h3>ResearchNet Copilot</h3>
          </div>
          <button type="button" onClick={toggleOpen} aria-label="Close assistant">
            ✕
          </button>
        </div>

        <div className="floating-ai-suggestions">
          {STARTER_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => submitQuestion(question)}
              disabled={loading}
            >
              {question}
            </button>
          ))}
        </div>

        <div className="floating-ai-messages" aria-live="polite">
          {messages.map((message, idx) => (
            <div key={`${message.role}-${idx}`} className={`floating-ai-message floating-ai-message--${message.role}`}>
              <div className="floating-ai-bubble">{message.content}</div>
            </div>
          ))}
          {loading && (
            <div className="floating-ai-message floating-ai-message--assistant">
              <div className="floating-ai-bubble floating-ai-bubble--loading">Thinking...</div>
            </div>
          )}
        </div>

        {error && <p className="floating-ai-error">{error}</p>}

        <form className="floating-ai-composer" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about publications, projects, researchers, reports..."
          />
          <button type="submit" disabled={!canSend}>
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </aside>
    </>
  );
}
