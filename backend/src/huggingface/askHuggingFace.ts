import { buildSystemPrompt } from "../prompts/tutorPrompt.js";
import { AskProviderInput, getErrorMessage } from "../shared/llmTypes.js";

/** Inference Providers: API compatible con OpenAI (sustituye el antiguo POST a api-inference.../models/...). */
const HF_CHAT_COMPLETIONS_URL = "https://router.huggingface.co/v1/chat/completions";

/** Modelo pequeño con buena cobertura en Inference Providers; SmolLM2 no esta soportado en hf-inference (chat). */
const DEFAULT_HF_MODEL = "meta-llama/Llama-3.2-1B-Instruct";

/**
 * Modelos pequenos (1B) suelen ignorar prompts largos. Recortamos contexto e inventario
 * y agregamos un recordatorio corto justo antes del mensaje del usuario.
 */
const HF_MAX_DOCUMENT_CHARS = 16_000;
const HF_MAX_INVENTORY_ITEMS = 40;
const HF_MAX_SNIPPETS = 2;
const HF_MAX_SNIPPET_CHARS = 600;

function shrinkForHuggingFace(input: AskProviderInput): AskProviderInput {
  let courseContext = input.courseContext;
  if (courseContext.length > HF_MAX_DOCUMENT_CHARS) {
    courseContext =
      courseContext.slice(0, HF_MAX_DOCUMENT_CHARS) +
      "\n\n[Fragmento del documento: solo se enviaron las primeras " +
      HF_MAX_DOCUMENT_CHARS +
      " caracteres por limite del modelo.]";
  }

  let documentsInventory = input.documentsInventory;
  if (documentsInventory && documentsInventory.length > HF_MAX_INVENTORY_ITEMS) {
    const rest = documentsInventory.length - HF_MAX_INVENTORY_ITEMS;
    documentsInventory = [
      ...documentsInventory.slice(0, HF_MAX_INVENTORY_ITEMS),
      `(...${rest} rutas omitidas por limite del modelo.)`
    ];
  }

  let additionalSnippets = input.additionalSnippets;
  if (additionalSnippets?.length) {
    additionalSnippets = additionalSnippets.slice(0, HF_MAX_SNIPPETS).map((s) => ({
      path: s.path,
      snippet:
        s.snippet.length > HF_MAX_SNIPPET_CHARS
          ? `${s.snippet.slice(0, HF_MAX_SNIPPET_CHARS)}...`
          : s.snippet
    }));
  }

  return { ...input, courseContext, documentsInventory, additionalSnippets };
}

const HF_USER_REMINDER = [
  "INSTRUCCIONES CRITICAS DE TONO:",
  "- Empieza SIEMPRE con la respuesta directa, copiada o citada del documento.",
  "- PROHIBIDO empezar con o usar: 'no se proporciono', 'no se menciona', 'no aparece', 'no encuentro X pero', 'sin embargo puedo sugerir', 'podria ser', 'tal vez', 'creo que', 'posibilidades', 'opciones que podrian ser'.",
  "- Si el dato exacto no aparece, da DIRECTAMENTE lo mas cercano que SI este en el texto del documento (titulo, encabezado, codigo de norma, primera linea util), sin aclarar que no encontraste lo exacto.",
  "- Nunca generes listas tipo '1. ... 2. ... 3. ...' con posibles respuestas. Una sola frase concreta.",
  "- No agregues disculpas, advertencias ni matices.",
  "",
  "Pregunta del usuario:"
].join("\n");

/**
 * Sin sufijo (":...") anadimos ":fastest" para que el router elija un proveedor que si sirva el modelo.
 * ":hf-inference" solo sirve para modelos que ese proveedor expone (evitar para SmolLM2 en chat).
 */
function resolveRouterModel(envValue: string | undefined): string {
  const raw = (envValue ?? DEFAULT_HF_MODEL).trim();
  if (raw.includes(":")) {
    return raw;
  }
  return `${raw}:fastest`;
}

export async function askHuggingFace({
  message,
  courseContext,
  documentsInventory,
  activeDocumentPath,
  additionalSnippets
}: AskProviderInput): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY?.trim();
  if (!apiKey) {
    return "Falta configurar HUGGINGFACE_API_KEY en el backend.";
  }

  const model = resolveRouterModel(process.env.HUGGINGFACE_MODEL);

  const shrunk = shrinkForHuggingFace({
    message,
    courseContext,
    documentsInventory,
    activeDocumentPath,
    additionalSnippets
  });

  const systemContent = buildSystemPrompt({
    documentContext: shrunk.courseContext,
    documentsInventory: shrunk.documentsInventory,
    activeDocumentPath: shrunk.activeDocumentPath,
    additionalSnippets: shrunk.additionalSnippets
  });

  const reinforcedUserContent = `${HF_USER_REMINDER}\n${message}`;

  try {
    const response = await fetch(HF_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: reinforcedUserContent }
        ],
        max_tokens: 512,
        temperature: 0.2
      })
    });

    const rawBody = await response.text();

    if (response.status === 503) {
      return `Hugging Face temporalmente no disponible (503). Reintenta en unos segundos. Detalle: ${truncateBody(rawBody, 300)}`;
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        const fromApi = parseHfErrorPayload(rawBody);
        const hint =
          "Revisa el token en backend/.env: debe ser valido y, para Inference Providers en router.huggingface.co, activa el permiso 'Make calls to Inference Providers' en un token fine-grained (pagina nueva de token). Crear: https://huggingface.co/settings/tokens";
        const detail = fromApi ? ` Detalle del API: ${fromApi}` : ` Respuesta: ${truncateBody(rawBody, 280)}`;
        return `Hugging Face rechazo la autenticacion (HTTP ${response.status}).${detail} — ${hint}`;
      }
      if (response.status === 400 && /not supported by any provider/i.test(rawBody)) {
        return (
          "Hugging Face (400): ningun proveedor habilitado en tu cuenta sirve ese modelo. " +
          "Prueba otro modelo en HUGGINGFACE_MODEL o revisa https://huggingface.co/settings/inference-providers . " +
          `Detalle: ${truncateBody(rawBody, 450)}`
        );
      }
      if (response.status === 400 && /not supported by provider/i.test(rawBody)) {
        return (
          "Ese modelo no esta disponible con el proveedor que pediste (p. ej. hf-inference). " +
          "Borra el sufijo en .env y deja solo el id del modelo (el backend anade ':fastest'), " +
          "o pon en HUGGINGFACE_MODEL el valor por defecto del proyecto (meta-llama/Llama-3.2-1B-Instruct). " +
          "Si usas Llama, acepta la licencia en la pagina del modelo en Hugging Face. " +
          `API: ${truncateBody(rawBody, 450)}`
        );
      }
      return `Hugging Face error HTTP ${response.status}: ${truncateBody(rawBody, 500)}`;
    }

    let data: unknown;
    try {
      data = JSON.parse(rawBody) as unknown;
    } catch {
      return `Hugging Face devolvio texto no JSON: ${rawBody.slice(0, 300)}`;
    }

    const answer = extractChatContent(data);
    return answer || "No encuentro esa informacion en el documento.";
  } catch (error) {
    return `Hugging Face devolvio un error: ${getErrorMessage(error)}`;
  }
}

function truncateBody(raw: string, max: number): string {
  const t = raw.trim();
  if (t.startsWith("<!DOCTYPE") || t.toLowerCase().startsWith("<html")) {
    return "el servidor devolvio HTML (suele indicar URL incorrecta o error de proxy).";
  }
  return t.slice(0, max);
}

/** Mensaje corto desde JSON tipo OpenAI { error: { message } } o { message }. */
function parseHfErrorPayload(raw: string): string | null {
  try {
    const data = JSON.parse(raw) as { error?: unknown; message?: unknown };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim().slice(0, 400);
    }
    const err = data.error;
    if (typeof err === "string" && err.trim()) {
      return err.trim().slice(0, 400);
    }
    if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
      return String((err as { message: string }).message).trim().slice(0, 400);
    }
  } catch {
    /* no JSON */
  }
  return null;
}

function extractChatContent(data: unknown): string {
  if (typeof data !== "object" || data === null) {
    return "";
  }

  if ("error" in data) {
    const e = (data as { error?: unknown }).error;
    if (typeof e === "string") {
      return `Hugging Face: ${e}`;
    }
    if (typeof e === "object" && e !== null && "message" in e) {
      const m = (e as { message?: unknown }).message;
      if (typeof m === "string") {
        return `Hugging Face: ${m}`;
      }
    }
  }

  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") {
    return "";
  }

  const msg = (choices[0] as { message?: { content?: string } }).message;
  const content = msg?.content;
  return typeof content === "string" ? content.trim() : "";
}
