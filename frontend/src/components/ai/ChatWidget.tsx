import { useEffect, useRef, useState } from "react";
import { sendChatMessage, type ActionTaken, type ChatMessage } from "../../api/ai";
import "./ChatWidget.css";

const QUICK_PROMPTS = [
  "What tasks do I have?",
  "What's due this week?",
  "Show my high priority tasks",
  "How many tasks am I working on?",
  "Create a task to review pull requests",
];

function actionIcon(type: string) {
  if (type === "create") return "✅";
  if (type === "archive") return "📦";
  if (type === "update") return "✏️";
  return "⚡";
}

type UiMessage =
  | { kind: "user"; text: string }
  | { kind: "model"; text: string; actions?: ActionTaken[] }
  | { kind: "error"; text: string };

interface ChatWidgetProps {
  onTasksChanged?: () => void;
}

export default function ChatWidget({ onTasksChanged }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [uiMessages, setUiMessages] = useState<UiMessage[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uiMessages, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  };

  const send = async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setUiMessages((prev) => [...prev, { kind: "user", text: trimmed }]);

    const newHistory: ChatMessage[] = [
      ...history,
      { role: "user", content: trimmed },
    ];

    setLoading(true);
    try {
      const res = await sendChatMessage(trimmed, history);

      setUiMessages((prev) => [
        ...prev,
        { kind: "model", text: res.reply, actions: res.actions_taken },
      ]);

      setHistory([
        ...newHistory,
        { role: "model", content: res.reply },
      ]);

      if (res.actions_taken && res.actions_taken.length > 0) {
        onTasksChanged?.();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setUiMessages((prev) => [...prev, { kind: "error", text: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearAndClose = () => {
    setOpen(false);
  };

  const showQuickStart = uiMessages.length === 0;

  return (
    <>
      <button
        id="ai-chat-fab"
        className={`chat-fab ${open ? "open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open AI Assistant"
        title="AI Assistant"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a2 2 0 0 1 2 2v1h2a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h2V4a2 2 0 0 1 2-2z" />
            <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
            <path d="M9 16s1 1 3 1 3-1 3-1" />
          </svg>
        )}
      </button>

      {open && (
        <div className="chat-panel" role="dialog" aria-label="AI Task Assistant">
          <div className="chat-panel-header">
            <div className="chat-header-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="chat-header-info">
              <h4>Planora AI</h4>
              <span>Your smart task assistant</span>
            </div>
            <button className="chat-close-btn" onClick={clearAndClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="chat-messages" id="chat-messages-list">
            {showQuickStart && (
              <div className="chat-quickstart">
                <p className="chat-welcome-msg">
                  👋 Hi! I'm your AI task assistant. Ask me anything about your tasks or tell me what to do!
                </p>
                <div className="chat-chips">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      className="chat-chip"
                      onClick={() => send(prompt)}
                      disabled={loading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {uiMessages.map((msg, idx) => {
              if (msg.kind === "error") {
                return (
                  <div key={idx} className="chat-error">
                    ⚠️ {msg.text}
                  </div>
                );
              }

              if (msg.kind === "user") {
                return (
                  <div key={idx} className="chat-msg user">
                    <div className="chat-bubble">{msg.text}</div>
                  </div>
                );
              }

              return (
                <div key={idx} className="chat-msg model">
                  <div className="chat-bubble">{msg.text}</div>
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="chat-actions">
                      {msg.actions.map((a, ai) => (
                        <div key={ai} className="chat-action-card">
                          <span className="chat-action-icon">{actionIcon(a.type)}</span>
                          <span>{a.summary}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="chat-typing" aria-label="AI is thinking">
                <span /><span /><span />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              ref={textareaRef}
              id="chat-input"
              className="chat-textarea"
              rows={1}
              placeholder="Ask me anything about your tasks…"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              aria-label="Chat message input"
            />
            <button
              id="chat-send-btn"
              className="chat-send-btn"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
