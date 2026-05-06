import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSystemPrompt } from "../prompts/tutorPrompt.js";

type AskTutorInput = {
  message: string;
  courseContext: string;
  provider?: "gemini" | "groq";
};

const geminiApiKey = process.env.GEMINI_API_KEY || "";
const geminiClient = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export async function askTutor({ message, courseContext, provider = "gemini" }: AskTutorInput): Promise<string> {
  if (!courseContext.trim()) {
    return "No encuentro esa informacion en el contenido del curso.";
  }

  if (provider === "groq") {
    return askWithGroq({ message, courseContext });
  }

  if (!geminiClient) {
    return "Falta configurar GEMINI_API_KEY en el backend.";
  }

  const configuredModel = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const modelName = normalizeGeminiModel(configuredModel);
  const model = geminiClient.getGenerativeModel({ model: modelName });

  const prompt = [
    buildSystemPrompt(courseContext),
    "",
    "PREGUNTA DEL USUARIO:",
    message
  ].join("\n");

  try {
    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();
    return answer || "No encuentro esa informacion en el contenido del curso.";
  } catch (error) {
    const rawMessage = getErrorMessage(error);
    console.error("[Gemini] Error al generar contenido:", rawMessage);

    if (/api key|credential|unauth|permission|forbidden|403/i.test(rawMessage)) {
      return "Gemini rechazo la autenticacion. Revisa GEMINI_API_KEY y permisos del proyecto.";
    }

    if (/quota|rate|429|resource has been exhausted/i.test(rawMessage)) {
      return "Gemini indico limite de uso por ahora (quota/rate limit). Intenta mas tarde.";
    }

    if (/model|not found|404/i.test(rawMessage)) {
      return `El modelo '${configuredModel}' no esta disponible para esta cuenta.`;
    }

    return `Gemini devolvio un error: ${rawMessage}`;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function normalizeGeminiModel(value: string): string {
  return value.replace(/^models\//, "");
}

async function askWithGroq({ message, courseContext }: AskTutorInput): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return "Falta configurar GROQ_API_KEY en el backend.";
  }

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
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
      return `Groq devolvio error HTTP ${response.status}: ${errorText}`;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = data.choices?.[0]?.message?.content?.trim() || "";
    return answer || "No encuentro esa informacion en el contenido del curso.";
  } catch (error) {
    return `Groq devolvio un error: ${getErrorMessage(error)}`;
  }
}
