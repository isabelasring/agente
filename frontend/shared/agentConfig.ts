export const AGENT_CHAT_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:3001/api/chat";

export const AGENT_DOCUMENTS_URL = AGENT_CHAT_URL.replace("/chat", "/documents");

export const COURSE_ID = process.env.NEXT_PUBLIC_COURSE_ID || "geo-basico";

export const DEFAULT_DOCUMENT_ID = process.env.NEXT_PUBLIC_LESSON_ID || "leccion-1";

export function backendUnavailableMessage(): string {
  try {
    const url = new URL(AGENT_CHAT_URL);
    return `No pude conectar con el backend. Verifica que este corriendo en ${url.host}.`;
  } catch {
    return "No pude conectar con el backend.";
  }
}
