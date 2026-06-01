import type { ChatTurn } from "./chatHistory.js";

export type AskProviderInput = {
  message: string;
  courseContext: string;
  documentsInventory?: string[];
  activeDocumentPath?: string;
  additionalSnippets?: Array<{ path: string; snippet: string }>;
  history?: ChatTurn[];
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
