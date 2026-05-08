"use client";

import { FormEvent, useState } from "react";
import {
  AGENT_CHAT_URL,
  ALL_FOLDERS_SENTINEL,
  backendUnavailableMessage,
  COURSE_ID,
  NO_DOCUMENT_SENTINEL
} from "../shared/agentConfig";
import type { ChatMessage } from "../shared/agentTypes";

type Props = {
  className?: string;
  displayName?: string;
  selectedDocumentId: string;
  selectedFolder?: string;
};

export default function HuggingFacePanel({
  className = "",
  displayName = "Hugging Face",
  selectedDocumentId,
  selectedFolder = ALL_FOLDERS_SENTINEL
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hola, soy tu agente Hugging Face. Analizo el documento activo y respondo con base en su contenido."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  const activeDocumentLabel =
    selectedDocumentId === NO_DOCUMENT_SENTINEL
      ? "Sin documento activo"
      : (selectedDocumentId.split("/").pop() || selectedDocumentId);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const startedAt = performance.now();

    const nextUserMessage: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, nextUserMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(AGENT_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          courseId: COURSE_ID,
          documentId: selectedDocumentId,
          provider: "huggingface",
          folder: selectedFolder === ALL_FOLDERS_SENTINEL ? "" : selectedFolder
        })
      });

      const data = (await response.json()) as { answer?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || data.error || "Ocurrio un error al procesar la respuesta."
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: backendUnavailableMessage()
        }
      ]);
    } finally {
      setLoading(false);
      setLastLatencyMs(Math.round(performance.now() - startedAt));
    }
  };

  return (
    <div className={`phone-shell ${className}`.trim()}>
      <header className="chat-header">
        <img className="bot-avatar" src="/agent-avatar.png" alt="Avatar del agente" />
        <div>
          <strong>
            Agente - <span className="agent-name">{displayName}</span>
          </strong>
          <p>En linea</p>
        </div>
      </header>

      <p className="doc-ready-badge">Documento activo listo: <strong>{activeDocumentLabel}</strong></p>
      <p className="latency-hint">
        Tiempo ultima respuesta: <strong>{formatLatency(lastLatencyMs)}</strong>
      </p>

      <div className="messages">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
            {message.content}
          </article>
        ))}
        {loading && (
          <article
            className="message assistant typing"
            aria-live="polite"
            aria-label="Hugging Face escribiendo"
          >
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </article>
        )}
      </div>

      <form className="form" onSubmit={onSubmit}>
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
        />
        <button className="button icon-button" type="submit" disabled={loading} aria-label="Enviar">
          <svg
            className="send-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M21 3L10 14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 3L14 21L10 14L3 10L21 3Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}


function formatLatency(ms: number | null): string {
  if (ms === null) return '--';
  if (ms < 1000) return String(ms) + " ms";
  const seconds = ms / 1000;
  if (seconds < 60) return seconds.toFixed(2) + " s";
  const minutes = seconds / 60;
  return minutes.toFixed(2) + " min";
}
