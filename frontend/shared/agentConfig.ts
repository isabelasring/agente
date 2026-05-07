export const AGENT_CHAT_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:3001/api/chat";

export const AGENT_DOCUMENTS_URL = AGENT_CHAT_URL.replace("/chat", "/documents");

/** Identificador enviado al API (meta) */
export const COURSE_ID = process.env.NEXT_PUBLIC_COURSE_ID || "geotrends";

/** Sin archivos indexables en la carpeta; el backend carga contexto vacio pero deja conversar el modelo */
export const NO_DOCUMENT_SENTINEL = "__geotrends_no_doc__";

/**
 * Documento inicial: ruta relativa (con extension) dentro de GEOTRENDS_DOCUMENTS_ROOT.
 * Vacio: usa el sentinel hasta que llegue la lista desde el servidor.
 */
const lessonFromEnv = (process.env.NEXT_PUBLIC_LESSON_ID ?? "").trim();

export const DEFAULT_DOCUMENT_ID =
  lessonFromEnv.length > 0 ? lessonFromEnv : NO_DOCUMENT_SENTINEL;

export function backendUnavailableMessage(): string {
  try {
    const url = new URL(AGENT_CHAT_URL);
    return `No pude conectar con el backend. Verifica que este corriendo en ${url.host}.`;
  } catch {
    return "No pude conectar con el backend.";
  }
}
