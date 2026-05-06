"use client";

import { FormEvent, useMemo, useState } from "react";
import { AGENT_CHAT_URL, backendUnavailableMessage, COURSE_ID } from "../shared/agentConfig";
import type { ChatMessage, DocumentItem } from "../shared/agentTypes";

type Props = {
  className?: string;
  displayName?: string;
  documents: DocumentItem[];
  documentsLoading: boolean;
  selectedDocumentId: string;
  onSelectedDocumentChange: (id: string) => void;
};

export default function GeminiPanel({
  className = "",
  displayName = "Gemini",
  documents,
  documentsLoading,
  selectedDocumentId,
  onSelectedDocumentChange
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hola, soy tu agente del curso. Puedes saludarme y tambien escoger un documento para que conversemos sobre su contenido."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedDocumentName = useMemo(() => {
    const selected = documents.find((item) => item.id === selectedDocumentId);
    return selected?.name || selectedDocumentId;
  }, [documents, selectedDocumentId]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading || !selectedDocumentId) return;

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
          provider: "gemini"
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
    }
  };

  return (
    <div className={`phone-shell ${className}`.trim()}>
      <header className="chat-header">
        <img className="bot-avatar" src="/agent-avatar.png" alt="Avatar del agente" />
        <div>
          <strong>
            Tutor Virtual - <span className="agent-name">{displayName}</span>
          </strong>
          <p>En linea</p>
        </div>
      </header>

      <section className="document-picker">
        <label htmlFor="gemini-document-select">Documento activo</label>
        <select
          id="gemini-document-select"
          className="select"
          value={selectedDocumentId}
          onChange={(event) => onSelectedDocumentChange(event.target.value)}
          disabled={loading || documentsLoading || documents.length === 0}
        >
          {documents.map((doc) => (
            <option key={doc.name} value={doc.id}>
              {doc.name}
            </option>
          ))}
        </select>
        <p className="document-hint">
          {documentsLoading
            ? "Cargando documentos..."
            : `Conversando sobre: ${selectedDocumentName}`}
        </p>
      </section>

      <div className="messages">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
            {message.content}
          </article>
        ))}
        {loading && (
          <article className="message assistant typing" aria-live="polite" aria-label="Gemini escribiendo">
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
