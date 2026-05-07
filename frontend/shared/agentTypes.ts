export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DocumentItem = {
  id: string;
  name: string;
  extension: ".md" | ".txt" | ".docx" | ".pdf" | ".xlsx";
};
