import { isComplexQuestion } from "./contextBudget.js";

export type RoutedProvider = "gemini" | "groq" | "deepseek";

export type RouteDecision = {
  provider: RoutedProvider;
  reason: string;
};

type RouteInput = {
  message: string;
  historyLength: number;
  documentCharLength: number;
};

const SIMPLE_QUESTION =
  /titulo|nombre|de que trata|resumen|resum|objeto|cual es|que es|fecha|version|año|cuantos|donde|quien/i;

function isDeepSeekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

/**
 * Reparte entre Groq (rapido), DeepSeek (analitico) y Gemini (documentos enormes).
 * Groq recorta el PDF internamente; no enviar todo a Gemini solo por tamano medio.
 */
export function pickProvider(input: RouteInput): RouteDecision {
  const { message, historyLength, documentCharLength } = input;
  const q = message.trim();
  const qLower = q.toLowerCase();
  const complex = isComplexQuestion(message, historyLength);
  const simple = SIMPLE_QUESTION.test(qLower) || q.length < 75;
  const enormousDoc = documentCharLength > 130_000;
  const deepseekOk = isDeepSeekConfigured();

  if (simple && !complex) {
    return {
      provider: "groq",
      reason: "Pregunta directa o corta → Groq (rapido)."
    };
  }

  if (complex && deepseekOk) {
    return {
      provider: "deepseek",
      reason: "Pregunta analitica o de seguimiento → DeepSeek."
    };
  }

  if (complex && !deepseekOk) {
    return {
      provider: "gemini",
      reason: "Pregunta analitica; DeepSeek no configurado → Gemini."
    };
  }

  if (enormousDoc) {
    return {
      provider: "gemini",
      reason: "Documento muy extenso → Gemini."
    };
  }

  if (q.length < 130 && historyLength <= 8) {
    return {
      provider: "groq",
      reason: "Pregunta breve → Groq."
    };
  }

  if (deepseekOk && q.length >= 130) {
    return {
      provider: "deepseek",
      reason: "Pregunta detallada → DeepSeek."
    };
  }

  return {
    provider: "gemini",
    reason: "Consulta general → Gemini."
  };
}

export function providerLabel(provider: RoutedProvider): string {
  switch (provider) {
    case "groq":
      return "Groq";
    case "deepseek":
      return "DeepSeek";
    default:
      return "Gemini";
  }
}
