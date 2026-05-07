import { buildSystemPrompt } from "../prompts/tutorPrompt.js";
import { AskProviderInput, getErrorMessage } from "../shared/llmTypes.js";

export async function askOpenAI({ message, courseContext }: AskProviderInput): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return "Falta configurar OPENAI_API_KEY en el backend.";
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const body = {
    model,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(courseContext)
      },
      {
        role: "user",
        content: message
      }
    ],
    temperature: 0.4
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401 || response.status === 403) {
        return "OpenAI rechazo la autenticacion. Revisa OPENAI_API_KEY.";
      }
      if (response.status === 429) {
        return "OpenAI indico limite de uso por ahora (quota/rate limit). Intenta mas tarde.";
      }
      return `OpenAI devolvio error HTTP ${response.status}: ${errorText}`;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = data.choices?.[0]?.message?.content?.trim() || "";
    return answer || "No encuentro esa informacion en el contenido del curso.";
  } catch (error) {
    return `OpenAI devolvio un error: ${getErrorMessage(error)}`;
  }
}
