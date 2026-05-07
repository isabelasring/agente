import { askGemini } from "../gemini/askGemini.js";
import { askGroq } from "../groq/askGroq.js";
import { askHuggingFace } from "../huggingface/askHuggingFace.js";
import { askOllama } from "../ollama/askOllama.js";
import { askOpenAI } from "../openai/askOpenAI.js";
import { askDeepSeek } from "../deepseek/askDeepSeek.js";

export type LlmProvider =
  | "gemini"
  | "groq"
  | "huggingface"
  | "ollama"
  | "openai"
  | "deepseek";

type AskTutorInput = {
  message: string;
  courseContext: string;
  documentsInventory?: string[];
  activeDocumentPath?: string;
  additionalSnippets?: Array<{ path: string; snippet: string }>;
  provider?: LlmProvider;
};

export async function askTutor({
  message,
  courseContext,
  documentsInventory,
  activeDocumentPath,
  additionalSnippets,
  provider = "gemini"
}: AskTutorInput): Promise<string> {
  const hasContext = courseContext.trim().length > 0;
  const hasSnippets = (additionalSnippets?.length ?? 0) > 0;

  if (!hasContext && !hasSnippets) {
    return "No hay contenido de carpeta cargado: no se encontro el documento elegido y la busqueda no encontro coincidencias en otros archivos. Verifica GEOTRENDS_DOCUMENTS_ROOT y que la carpeta tenga archivos .pdf, .txt, .md, .docx o .xlsx.";
  }

  const payload = {
    message,
    courseContext,
    documentsInventory,
    activeDocumentPath,
    additionalSnippets
  };

  switch (provider) {
    case "groq":
      return askGroq(payload);
    case "huggingface":
      return askHuggingFace(payload);
    case "ollama":
      return askOllama(payload);
    case "openai":
      return askOpenAI(payload);
    case "deepseek":
      return askDeepSeek(payload);
    default:
      return askGemini(payload);
  }
}
