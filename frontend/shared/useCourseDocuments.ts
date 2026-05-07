import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  AGENT_DOCUMENTS_URL,
  AGENT_FOLDERS_URL,
  ALL_FOLDERS_SENTINEL,
  COURSE_ID,
  NO_DOCUMENT_SENTINEL
} from "./agentConfig";
import type { DocumentItem } from "./agentTypes";

export function useCourseDocuments(
  _selectedDocumentId: string,
  setSelectedDocumentId: Dispatch<SetStateAction<string>>,
  selectedFolder: string = ALL_FOLDERS_SENTINEL
) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      setDocumentsLoading(true);
      try {
        const folderQuery =
          selectedFolder && selectedFolder !== ALL_FOLDERS_SENTINEL
            ? `&folder=${encodeURIComponent(selectedFolder)}`
            : "";
        const response = await fetch(
          `${AGENT_DOCUMENTS_URL}?courseId=${encodeURIComponent(COURSE_ID)}${folderQuery}`
        );
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
  }, [setSelectedDocumentId, selectedFolder]);

  return { documents, documentsLoading };
}

export function useTopLevelFolders() {
  const [folders, setFolders] = useState<string[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setFoldersLoading(true);
      try {
        const response = await fetch(AGENT_FOLDERS_URL);
        const data = (await response.json()) as { folders?: string[] };
        if (!cancelled) setFolders(data.folders || []);
      } catch {
        if (!cancelled) setFolders([]);
      } finally {
        if (!cancelled) setFoldersLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { folders, foldersLoading };
}
