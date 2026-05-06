import { buildSystemPrompt } from "../prompts/tutorPrompt.js";
import { AskProviderInput, getErrorMessage } from "../shared/llmTypes.js";

/** Inference Providers: API compatible con OpenAI (sustituye el antiguo POST a api-inference.../models/...). */
const HF_CHAT_COMPLETIONS_URL = "https://router.huggingface.co/v1/chat/completions";

/** Modelo pequeño con buena cobertura en Inference Providers; SmolLM2 no esta soportado en hf-inference (chat). */
const DEFAULT_HF_MODEL = "meta-llama/Llama-3.2-1B-Instruct";

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

export async function askHuggingFace({ message, courseContext }: AskProviderInput): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY?.trim();
  if (!apiKey) {
    return "Falta configurar HUGGINGFACE_API_KEY en el backend.";
  }

  const model = resolveRouterModel(process.env.HUGGINGFACE_MODEL);

  const systemContent = buildSystemPrompt(courseContext);

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
          { role: "user", content: message }
        ],
        max_tokens: 512,
        temperature: 0.4
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
    return answer || "No encuentro esa informacion en el contenido del curso.";
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
