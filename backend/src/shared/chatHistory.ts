export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

/** Maximo 6 intercambios (12 mensajes) para controlar tokens. */
export const MAX_HISTORY_MESSAGES = 12;

export function normalizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as ChatTurn).role;
    const content = String((item as ChatTurn).content ?? "").trim();
    if ((role === "user" || role === "assistant") && content) {
      out.push({ role, content });
    }
  }
  return trimHistory(out);
}

export function trimHistory(history: ChatTurn[]): ChatTurn[] {
  return history.slice(-MAX_HISTORY_MESSAGES);
}

export function buildOpenAiMessages(
  systemContent: string,
  history: ChatTurn[],
  userMessage: string
): Array<{ role: string; content: string }> {
  return [
    { role: "system", content: systemContent },
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: "user", content: userMessage }
  ];
}
