"use client";

import { FormEvent, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:4000/api/chat";

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hola, soy tu agente del curso. Preguntame sobre la leccion 1 de geo-basico."
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
          courseId: "geo-basico",
          lessonId: "leccion-1"
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
      <h1>Agente Educativo Local</h1>
      <p>Arquitectura lista para conectar Open edX y Vtiger despues, via backend.</p>

      <section className="chat-box">
        <div className="messages">
          {messages.map((message, index) => (
            <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
              {message.content}
            </article>
          ))}
        </div>

        <form className="form" onSubmit={onSubmit}>
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu duda del curso..."
          />
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Pensando..." : "Enviar"}
          </button>
        </form>
      </section>
    </main>
  );
}
