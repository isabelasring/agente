import { useEffect, useState } from "react";
import { AGENT_DOCUMENTS_URL, COURSE_ID } from "./agentConfig";
import type { DocumentItem } from "./agentTypes";

export function useCourseDocuments(selectedDocumentId: string, setSelectedDocumentId: (id: string) => void) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  useEffect(() => {
    const loadDocuments = async () => {
      setDocumentsLoading(true);
      try {
        const response = await fetch(`${AGENT_DOCUMENTS_URL}?courseId=${encodeURIComponent(COURSE_ID)}`);
        const data = (await response.json()) as {
          documents?: DocumentItem[];
        };
        const availableDocs = data.documents || [];
        setDocuments(availableDocs);

        const currentExists = availableDocs.some((doc) => doc.id === selectedDocumentId);
        if (!currentExists && availableDocs[0]) {
          setSelectedDocumentId(availableDocs[0].id);
        }
      } catch {
        setDocuments([]);
      } finally {
        setDocumentsLoading(false);
      }
    };

    loadDocuments();
  }, [selectedDocumentId, setSelectedDocumentId]);

  return { documents, documentsLoading };
}
