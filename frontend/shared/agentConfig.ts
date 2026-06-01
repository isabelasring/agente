export const AGENT_CHAT_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:3001/api/chat";

export const AGENT_DOCUMENTS_URL = AGENT_CHAT_URL.replace("/chat", "/documents");

export const AGENT_FOLDERS_URL = AGENT_CHAT_URL.replace("/chat", "/folders");
export const AGENT_DOCUMENT_FILE_URL = AGENT_CHAT_URL.replace("/chat", "/document");
export const AGENT_DOCUMENT_TEXT_URL = AGENT_CHAT_URL.replace("/chat", "/document/text");
export const AGENT_DOCUMENT_HTML_URL = AGENT_CHAT_URL.replace("/chat", "/document/html");

/** Valor del selector cuando el usuario quiere usar TODAS las carpetas del alcance actual. */
export const ALL_FOLDERS_SENTINEL = "__all_folders__";

/** Une biblioteca + subcarpeta en el prefijo que filtra documentos en el backend. */
export function buildFolderPrefix(library: string, subfolder: string): string {
  const lib = library.trim();
  const sub = subfolder.trim();
  if (!lib || lib === ALL_FOLDERS_SENTINEL) return "";
  if (!sub || sub === ALL_FOLDERS_SENTINEL) return lib;
  return `${lib}/${sub}`;
}

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
