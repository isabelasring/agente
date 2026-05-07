import { askGemini } from "../gemini/askGemini.js";
import { askGroq } from "../groq/askGroq.js";
import { askHuggingFace } from "../huggingface/askHuggingFace.js";
import { askOllama } from "../ollama/askOllama.js";
import { askOpenAI } from "../openai/askOpenAI.js";

export type LlmProvider = "gemini" | "groq" | "huggingface" | "ollama" | "openai";

type AskTutorInput = {
  message: string;
  courseContext: string;
  provider?: LlmProvider;
};

export async function askTutor({ message, courseContext, provider = "gemini" }: AskTutorInput): Promise<string> {
  if (!courseContext.trim()) {
    return "No hay contenido de carpeta cargado: no se encontro el documento elegido o la carpeta GEOTRENDS_DOCUMENTS_ROOT no tiene archivos .pdf, .txt, .md o .docx (los .xlsx no se leen aun). Revisa backend/.env y la carpeta de Proyectos.";
  }

  switch (provider) {
    case "groq":
      return askGroq({ message, courseContext });
    case "huggingface":
      return askHuggingFace({ message, courseContext });
    case "ollama":
      return askOllama({ message, courseContext });
    case "openai":
      return askOpenAI({ message, courseContext });
    default:
      return askGemini({ message, courseContext });
  }
}
