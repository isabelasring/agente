export type AskProviderInput = {
  message: string;
  courseContext: string;
  documentsInventory?: string[];
  activeDocumentPath?: string;
  additionalSnippets?: Array<{ path: string; snippet: string }>;
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
