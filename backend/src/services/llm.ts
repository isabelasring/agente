import { askGemini } from "../gemini/askGemini.js";
import { askGroq } from "../groq/askGroq.js";
import { askHuggingFace } from "../huggingface/askHuggingFace.js";
import { askOllama } from "../ollama/askOllama.js";

export type LlmProvider = "gemini" | "groq" | "huggingface" | "ollama";

type AskTutorInput = {
  message: string;
  courseContext: string;
  provider?: LlmProvider;
};

export async function askTutor({ message, courseContext, provider = "gemini" }: AskTutorInput): Promise<string> {
  if (!courseContext.trim()) {
    return "No encuentro esa informacion en el contenido del curso.";
  }

  switch (provider) {
    case "groq":
      return askGroq({ message, courseContext });
    case "huggingface":
      return askHuggingFace({ message, courseContext });
    case "ollama":
      return askOllama({ message, courseContext });
    default:
      return askGemini({ message, courseContext });
  }
}
