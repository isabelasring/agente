import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { AGENT_DOCUMENTS_URL, COURSE_ID, NO_DOCUMENT_SENTINEL } from "./agentConfig";
import type { DocumentItem } from "./agentTypes";

export function useCourseDocuments(
  _selectedDocumentId: string,
  setSelectedDocumentId: Dispatch<SetStateAction<string>>
) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      setDocumentsLoading(true);
      try {
        const response = await fetch(`${AGENT_DOCUMENTS_URL}?courseId=${encodeURIComponent(COURSE_ID)}`);
        const data = (await response.json()) as {
          documents?: DocumentItem[];
        };
        if (cancelled) return;
        const availableDocs = data.documents || [];
        setDocuments(availableDocs);

        setSelectedDocumentId((prev) => {
          const exists = availableDocs.some((doc) => doc.id === prev);
          if (exists) return prev;
          if (availableDocs[0]) return availableDocs[0].id;
          return NO_DOCUMENT_SENTINEL;
        });
      } catch {
        if (!cancelled) {
          setDocuments([]);
          setSelectedDocumentId(NO_DOCUMENT_SENTINEL);
        }
      } finally {
        if (!cancelled) setDocumentsLoading(false);
      }
    };

    void loadDocuments();
    return () => {
      cancelled = true;
    };
  }, [setSelectedDocumentId]);

  return { documents, documentsLoading };
}
