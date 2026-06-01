import type { ChatTurn } from "../shared/chatHistory.js";

const COMPLEX_QUESTION =
  /segun lo|segun el|segun la|anterior|compara|comparar|articulo|sancion|explica en detalle|diferencia entre|tabla|calcula|plazo|por que|porque|detalla|fundamenta|requisito|procedimiento|paso a paso/i;

export function isComplexQuestion(message: string, historyLength: number): boolean {
  if (historyLength >= 10) return true;
  return COMPLEX_QUESTION.test(message.toLowerCase());
}

export function trimDocumentContext(context: string, maxChars: number): string {
  if (context.length <= maxChars) return context;
  return (
    context.slice(0, maxChars) +
    `\n\n[Documento truncado a ${maxChars} caracteres para ajustar el limite del modelo.]`
  );
}

/** Ajusta el texto del documento segun proveedor e historial. */
export function budgetDocumentContext(
  context: string,
  provider: "gemini" | "groq" | "deepseek",
  message: string,
  history: ChatTurn[]
): string {
  const hasHistory = history.length > 0;
  const complex = isComplexQuestion(message, history.length);

  if (provider === "gemini") {
    return trimDocumentContext(context, 180_000);
  }

  if (provider === "deepseek") {
    return trimDocumentContext(context, complex ? 48_000 : 32_000);
  }

  // groq: recorte agresivo; en seguimiento corto prioriza inicio del doc (titulos)
  if (hasHistory && !complex && message.length < 140) {
    return trimDocumentContext(context, 12_000);
  }
  return trimDocumentContext(context, 18_000);
}
