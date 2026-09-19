import { useState } from "react";
import AppShell from "../components/AppShell";
import { askAssistant } from "../api/ai";
import "./AIAssistant.css";

const starterQuestions = [
  "How many publications are in the application?",
  "What project data is available?",
  "How many researchers are registered?",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "I can answer questions about this application’s data, dashboard, researchers, publications, projects, collaborations, conferences, and reports. Ask me about the platform itself or its current records.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextUserMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, nextUserMessage]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await askAssistant(trimmed);
      setMessages((prev) => [...prev, { role: "assistant", content: response.data.answer }]);
    } catch (err) {
      setError(err.response?.data?.detail || "The assistant is unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="assistant-page">
        <header className="assistant-header">
          <div>
            <span className="dashboard-badge">AI Workspace Assistant</span>
            <h1 className="assistant-title">Ask the research assistant</h1>
          </div>
        </header>

        <div className="assistant-panel">
          <div className="assistant-suggestions">
            {starterQuestions.map((question) => (
              <button
                key={question}
                type="button"
                className="assistant-chip"
                onClick={() => setInput(question)}
              >
                {question}
              </button>
            ))}
          </div>

          <div className="assistant-chat" aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}>
                <div className="assistant-bubble">
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="assistant-message assistant">
                <div className="assistant-bubble assistant-loading">Thinking…</div>
              </div>
            )}
          </div>

          {error && <p className="assistant-error">{error}</p>}

          <form className="assistant-composer" onSubmit={handleSubmit}>
            <textarea
              rows="3"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about publications, researchers, projects, collaborations, or dashboard data..."
              aria-label="Ask the assistant"
            />
            <div className="assistant-actions">
              <span className="assistant-hint">Only answers for this application</span>
              <button type="submit" className="assistant-send" disabled={loading || !input.trim()}>
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
