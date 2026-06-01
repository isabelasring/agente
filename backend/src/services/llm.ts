import { askGemini } from "../gemini/askGemini.js";
import { askGroq } from "../groq/askGroq.js";
import { askHuggingFace } from "../huggingface/askHuggingFace.js";
import { askOllama } from "../ollama/askOllama.js";
import { askOpenAI } from "../openai/askOpenAI.js";
import { askDeepSeek } from "../deepseek/askDeepSeek.js";
import type { ChatTurn } from "../shared/chatHistory.js";
import { budgetDocumentContext } from "./contextBudget.js";
import { pickProvider, type RoutedProvider } from "./providerRouter.js";

export type LlmProvider =
  | "gemini"
  | "groq"
  | "huggingface"
  | "ollama"
  | "openai"
  | "deepseek"
  | "auto";

type AskTutorInput = {
  message: string;
  courseContext: string;
  documentsInventory?: string[];
  activeDocumentPath?: string;
  additionalSnippets?: Array<{ path: string; snippet: string }>;
  history?: ChatTurn[];
  provider?: LlmProvider;
};

export async function askTutor({
  message,
  courseContext,
  documentsInventory,
  activeDocumentPath,
  additionalSnippets,
  history,
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
    additionalSnippets,
    history
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

function shouldFallbackToGemini(provider: RoutedProvider, answer: string): boolean {
  if (provider === "gemini") return false;
  if (/HTTP 413|413\)/i.test(answer)) return true;
  if (/Falta configurar DEEPSEEK|DeepSeek rechazo/i.test(answer)) return true;
  if (/Groq rechazo la autenticacion|Groq indico limite/i.test(answer)) return provider === "groq";
  return false;
}

/** Agente unificado: elige Gemini, Groq o DeepSeek y hace fallback a Gemini si falla. */
export async function askSmartTutor(
  input: Omit<AskTutorInput, "provider">
): Promise<{ answer: string; provider: RoutedProvider; routingReason: string }> {
  const history = input.history ?? [];
  const decision = pickProvider({
    message: input.message,
    historyLength: history.length,
    documentCharLength: input.courseContext.length
  });

  let provider = decision.provider;
  let routingReason = decision.reason;

  let courseContext = budgetDocumentContext(
    input.courseContext,
    provider,
    input.message,
    history
  );

  let answer = await askTutor({
    ...input,
    courseContext,
    history,
    provider
  });

  if (shouldFallbackToGemini(provider, answer)) {
    routingReason = `${decision.reason} Fallback → Gemini (${provider} no disponible o limite).`;
    provider = "gemini";
    courseContext = budgetDocumentContext(
      input.courseContext,
      "gemini",
      input.message,
      history
    );
    answer = await askTutor({
      ...input,
      courseContext,
      history,
      provider: "gemini"
    });
  }

  console.log(`[smart] provider=${provider} reason=${routingReason}`);

  return { answer, provider, routingReason };
}
