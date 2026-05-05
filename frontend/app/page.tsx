"use client";

import { FormEvent, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:4000/api/chat";
const COURSE_ID = process.env.NEXT_PUBLIC_COURSE_ID || "mi-curso";
const LESSON_ID = process.env.NEXT_PUBLIC_LESSON_ID || "modulo-1";

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hola, soy tu agente del curso. Cuando me indiques el archivo de la leccion, respondere solo con ese contenido."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

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
          lessonId: LESSON_ID
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
          content: "No pude conectar con el backend. Verifica que este corriendo en localhost:4000."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <h1>Geobot</h1>
        <p>Soy tu agente de apoyo para resolver dudas del curso de forma clara y rapida.</p>
      </section>

      <section className="phone-shell">
        <header className="chat-header">
          <img className="bot-avatar" src="/agent-avatar.png" alt="Avatar del agente" />
          <div>
            <strong>Tutor Virtual</strong>
            <p>En linea</p>
          </div>
        </header>

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
      </section>
    </main>
  );
}
