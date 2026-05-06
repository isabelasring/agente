import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSystemPrompt } from "../prompts/tutorPrompt.js";

type AskTutorInput = {
  message: string;
  courseContext: string;
};

const geminiApiKey = process.env.GEMINI_API_KEY || "";
const geminiClient = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export async function askTutor({ message, courseContext }: AskTutorInput): Promise<string> {
  if (!geminiClient) {
    return "Falta configurar GEMINI_API_KEY en el backend.";
  }

  if (!courseContext.trim()) {
    return "No encuentro esa informacion en el contenido del curso.";
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
