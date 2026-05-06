"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type DocumentItem = {
  id: string;
  name: string;
  extension: ".md" | ".txt" | ".docx" | ".pdf";
};

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:3001/api/chat";
const DOCUMENTS_URL = API_URL.replace("/chat", "/documents");
const COURSE_ID = process.env.NEXT_PUBLIC_COURSE_ID || "geo-basico";
const DEFAULT_DOCUMENT_ID = process.env.NEXT_PUBLIC_LESSON_ID || "leccion-1";
const AGENT_CONFIGS = [
  { name: "Gemini", className: "agent-gemini" },
  { name: "Groq", className: "agent-groq" },
  { name: "Hugging Face", className: "agent-huggingface" },
  { name: "Ollama", className: "agent-ollama" }
];

export default function HomePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(DEFAULT_DOCUMENT_ID);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hola, soy tu agente del curso. Puedes saludarme y tambien escoger un documento para que conversemos sobre su contenido."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [groqMessages, setGroqMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hola, soy tu agente Groq. Estoy lista para responder sobre el documento activo."
    }
  ]);
  const [groqInput, setGroqInput] = useState("");
  const [groqLoading, setGroqLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  useEffect(() => {
    const loadDocuments = async () => {
      setDocumentsLoading(true);
      try {
        const response = await fetch(`${DOCUMENTS_URL}?courseId=${encodeURIComponent(COURSE_ID)}`);
        const data = (await response.json()) as {
          documents?: DocumentItem[];
        };
        const availableDocs = data.documents || [];
        setDocuments(availableDocs);

        const currentExists = availableDocs.some((doc) => doc.id === selectedDocumentId);
        if (!currentExists && availableDocs[0]) {
          setSelectedDocumentId(availableDocs[0].id);
        }
      } catch {
        setDocuments([]);
      } finally {
        setDocumentsLoading(false);
      }
    };

    loadDocuments();
  }, [selectedDocumentId]);

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
      const response = await fetch(API_URL, {
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
          content: "No pude conectar con el backend. Verifica que este corriendo en localhost:3001."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitGroq = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = groqInput.trim();
    if (!trimmed || groqLoading || !selectedDocumentId) return;

    const nextUserMessage: ChatMessage = { role: "user", content: trimmed };
    setGroqMessages((prev) => [...prev, nextUserMessage]);
    setGroqInput("");
    setGroqLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          courseId: COURSE_ID,
          documentId: selectedDocumentId,
          provider: "groq"
        })
      });

      const data = (await response.json()) as { answer?: string; error?: string };
      setGroqMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || data.error || "Ocurrio un error al procesar la respuesta."
        }
      ]);
    } catch {
      setGroqMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "No pude conectar con el backend. Verifica que este corriendo en localhost:3001."
        }
      ]);
    } finally {
      setGroqLoading(false);
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <h1>Geobot</h1>
        <p>Soy tu agente de apoyo para resolver dudas del curso de forma clara y rapida.</p>
      </section>

      <section className="agents-grid">
        <div className={`phone-shell ${AGENT_CONFIGS[0].className}`}>
        <header className="chat-header">
          <img className="bot-avatar" src="/agent-avatar.png" alt="Avatar del agente" />
          <div>
            <strong>
              Tutor Virtual - <span className="agent-name">{AGENT_CONFIGS[0].name}</span>
            </strong>
            <p>En linea</p>
          </div>
        </header>

        <section className="document-picker">
          <label htmlFor="document-select">Documento activo</label>
          <select
            id="document-select"
            className="select"
            value={selectedDocumentId}
            onChange={(event) => setSelectedDocumentId(event.target.value)}
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
            <article className="message assistant typing" aria-live="polite" aria-label="Geobot escribiendo">
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

        <div className={`phone-shell ${AGENT_CONFIGS[1].className}`}>
          <header className="chat-header">
            <img className="bot-avatar" src="/agent-avatar.png" alt="Avatar del agente" />
            <div>
              <strong>
                Tutor Virtual - <span className="agent-name">{AGENT_CONFIGS[1].name}</span>
              </strong>
              <p>En linea</p>
            </div>
          </header>

          <div className="messages">
            {groqMessages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
                {message.content}
              </article>
            ))}
            {groqLoading && (
              <article className="message assistant typing" aria-live="polite" aria-label="Groq escribiendo">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </article>
            )}
          </div>

          <form className="form" onSubmit={onSubmitGroq}>
            <input
              className="input"
              value={groqInput}
              onChange={(e) => setGroqInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
            />
            <button className="button icon-button" type="submit" disabled={groqLoading} aria-label="Enviar">
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

        {AGENT_CONFIGS.slice(2).map((agent) => (
          <div key={agent.name} className={`phone-shell placeholder-shell ${agent.className}`}>
            <header className="chat-header">
              <img className="bot-avatar" src="/agent-avatar.png" alt="Avatar del agente" />
              <div>
                <strong>
                  Tutor Virtual - <span className="agent-name">{agent.name}</span>
                </strong>
                <p>En linea</p>
              </div>
            </header>
            <div className="placeholder-content">
              <p>Chat de {agent.name} listo para configurar.</p>
              <p>Aqui haremos las pruebas de este proveedor.</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
