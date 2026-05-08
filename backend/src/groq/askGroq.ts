import { buildSystemPrompt } from "../prompts/tutorPrompt.js";
import { AskProviderInput, getErrorMessage } from "../shared/llmTypes.js";

export async function askGroq({
  message,
  courseContext,
  activeDocumentPath
}: AskProviderInput): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return "Falta configurar GROQ_API_KEY en el backend.";
  }

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  // Modo ultraligero para evitar 413 en cuentas free de Groq.
  const safeContext = trimForGroq(courseContext, 7000);
  const body = {
    model,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt({
          documentContext: safeContext,
          documentsInventory: [],
          activeDocumentPath,
          additionalSnippets: []
        })
      },
      {
        role: "user",
        content: message
      }
    ],
    temperature: 0.4
  };

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401 || response.status === 403) {
        return "Groq rechazo la autenticacion. Revisa GROQ_API_KEY.";
      }
      if (response.status === 429) {
        return "Groq indico limite de uso por ahora (quota/rate limit). Intenta mas tarde.";
      }
      if (response.status === 413) {
        return "Groq rechazo la solicitud por tamaño/límite de tokens (HTTP 413). Ya recorté contexto para Groq; vuelve a intentar o usa un documento más corto.";
      }
      return `Groq devolvio error HTTP ${response.status}: ${errorText}`;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = data.choices?.[0]?.message?.content?.trim() || "";
    return answer || "No encuentro esa informacion en el documento.";
  } catch (error) {
    return `Groq devolvio un error: ${getErrorMessage(error)}`;
  }
}

function trimForGroq(input: string, maxChars: number): string {
  const t = input.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}\n\n[...contenido recortado para cumplir limites de Groq...]`;
}
