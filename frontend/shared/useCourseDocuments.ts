import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  AGENT_DOCUMENTS_URL,
  AGENT_FOLDERS_URL,
  ALL_FOLDERS_SENTINEL,
  COURSE_ID,
  NO_DOCUMENT_SENTINEL
} from "./agentConfig";
import type { DocumentItem, FolderEntry } from "./agentTypes";

export function useCourseDocuments(
  _selectedDocumentId: string,
  setSelectedDocumentId: Dispatch<SetStateAction<string>>,
  selectedFolder: string = ALL_FOLDERS_SENTINEL,
  enabled = true
) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      const prefix = selectedFolder?.trim() ?? "";
      if (!enabled || !prefix || prefix === ALL_FOLDERS_SENTINEL) {
        setDocuments([]);
        setDocumentsLoading(false);
        return;
      }

      setDocumentsLoading(true);
      try {
        const folderQuery = `&folder=${encodeURIComponent(prefix)}`;
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
  }, [enabled, setSelectedDocumentId, selectedFolder]);

  return { documents, documentsLoading };
}

export function useTopLevelFolders(parent?: string) {
  const [folders, setFolders] = useState<string[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setFoldersLoading(true);
      try {
        const parentQuery =
          parent && parent !== ALL_FOLDERS_SENTINEL
            ? `?parent=${encodeURIComponent(parent)}`
            : "";
        const response = await fetch(`${AGENT_FOLDERS_URL}${parentQuery}`);
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
  }, [parent]);

  return { folders, foldersLoading };
}

/** Subcarpetas y archivos sueltos dentro de una biblioteca. */
export function useLibraryChildren(library?: string) {
  const [entries, setEntries] = useState<FolderEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!library?.trim()) {
        setEntries([]);
        setEntriesLoading(false);
        return;
      }

      setEntriesLoading(true);
      try {
        const response = await fetch(
          `${AGENT_FOLDERS_URL}?parent=${encodeURIComponent(library.trim())}`
        );
        const data = (await response.json()) as { entries?: FolderEntry[] };
        if (!cancelled) setEntries(data.entries || []);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setEntriesLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [library]);

  return { entries, entriesLoading };
}
