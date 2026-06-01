export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  /** Modelo que respondio (solo agente unificado). */
  providerLabel?: string;
};

export type DocumentItem = {
  id: string;
  name: string;
  extension: ".md" | ".txt" | ".docx" | ".pdf" | ".xlsx";
};

export type FolderEntry = {
  name: string;
  kind: "directory" | "file";
};
