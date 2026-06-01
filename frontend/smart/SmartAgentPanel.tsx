"use client";

import { FormEvent, useState } from "react";
import {
  AGENT_CHAT_URL,
  backendUnavailableMessage,
  COURSE_ID,
  NO_DOCUMENT_SENTINEL
} from "../shared/agentConfig";
import type { ChatMessage } from "../shared/agentTypes";
import { MessageContent } from "../shared/MessageContent";

type Props = {
  selectedDocumentId: string;
  selectedFolder: string;
};

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Hola, soy el agente inteligente. Elijo automaticamente Gemini, Groq o DeepSeek segun tu pregunta y el documento. Mantengo hasta 6 intercambios de historial."
};

export default function SmartAgentPanel({ selectedDocumentId, selectedFolder }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);

  const activeDocumentLabel =
    selectedDocumentId === NO_DOCUMENT_SENTINEL
      ? "Sin documento activo"
      : selectedDocumentId.split("/").pop() || selectedDocumentId;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const startedAt = performance.now();

    const history = messages
      .slice(1)
      .map(({ role, content }) => ({ role, content }));

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
          folder: selectedFolder,
          provider: "auto",
          autoRoute: true,
          history
        })
      });

      const data = (await response.json()) as {
        answer?: string;
        error?: string;
        meta?: { providerLabel?: string; provider?: string; routingReason?: string };
      };

      const providerLabel =
        data.meta?.providerLabel || data.meta?.provider || "auto";
      setLastProvider(
        data.meta?.routingReason
          ? `${providerLabel} — ${data.meta.routingReason}`
          : providerLabel
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || data.error || "Ocurrio un error al procesar la respuesta.",
          providerLabel
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
    <div className="smart-agent-shell agent-smart">
      <header className="chat-header">
        <img className="bot-avatar" src="/agent-avatar.png" alt="Avatar del agente inteligente" />
        <div>
          <strong>
            Agente inteligente — <span className="agent-name">Auto</span>
          </strong>
          <p>Gemini · Groq · DeepSeek segun la pregunta</p>
        </div>
      </header>

      <p className="doc-ready-badge">
        Documento activo: <strong>{activeDocumentLabel}</strong>
      </p>
      <p className="latency-hint">
        Ultima respuesta: <strong>{formatLatency(lastLatencyMs)}</strong>
        {lastProvider ? (
          <>
            {" "}
            · Modelo: <strong>{lastProvider}</strong>
          </>
        ) : null}
      </p>

      <div className="messages smart-messages">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
            {message.providerLabel && (
              <span className="provider-badge">{message.providerLabel}</span>
            )}
            <MessageContent role={message.role} content={message.content} />
          </article>
        ))}
        {loading && (
          <article className="message assistant typing" aria-live="polite" aria-label="Agente escribiendo">
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
          placeholder="Escribe tu pregunta sobre el documento..."
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
  if (ms === null) return "--";
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  return `${(seconds / 60).toFixed(2)} min`;
}
