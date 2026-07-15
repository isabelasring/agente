"use client";

import { useMemo, useState } from "react";
import GeminiPanel from "../gemini/GeminiPanel";
import GroqPanel from "../groq/GroqPanel";
import OllamaPanel from "../ollama/OllamaPanel";
import DeepSeekPanel from "../deepseek/DeepSeekPanel";
import SmartAgentPanel from "../smart/SmartAgentPanel";
import {
  buildFolderPrefix,
  NO_DOCUMENT_SENTINEL
} from "../shared/agentConfig";
import { DocumentPreview } from "../shared/DocumentPreview";
import type { FolderEntry } from "../shared/agentTypes";
import { useCourseDocuments, useLibraryChildren, useTopLevelFolders } from "../shared/useCourseDocuments";

const AGENT_PANELS = [
  { label: "Gemini", cssClass: "agent-gemini" },
  { label: "Groq", cssClass: "agent-groq" },
  { label: "Ollama", cssClass: "agent-ollama" },
  { label: "DeepSeek", cssClass: "agent-deepseek" }
] as const;

export default function HomePage() {
  const [selectedLibrary, setSelectedLibrary] = useState("");
  const [selectedSubfolder, setSelectedSubfolder] = useState("");
  const [selectedEntryKind, setSelectedEntryKind] = useState<"" | "directory" | "file">("");
  const [selectedDocumentId, setSelectedDocumentId] = useState(NO_DOCUMENT_SENTINEL);
  const [editLibrary, setEditLibrary] = useState(true);
  const [editChild, setEditChild] = useState(false);
  const [editDocument, setEditDocument] = useState(false);

  const { folders: libraries, foldersLoading: librariesLoading } = useTopLevelFolders();
  const { entries: libraryChildren, entriesLoading: libraryChildrenLoading } =
    useLibraryChildren(selectedLibrary || undefined);

  const selectedFolder = useMemo(
    () => buildFolderPrefix(selectedLibrary, selectedSubfolder),
    [selectedLibrary, selectedSubfolder]
  );

  const isDirectFile = selectedEntryKind === "file";

  const { documents, documentsLoading } = useCourseDocuments(
    selectedDocumentId,
    setSelectedDocumentId,
    selectedFolder,
    Boolean(selectedLibrary && selectedSubfolder && !isDirectFile)
  );

  const libraryReady = Boolean(selectedLibrary);
  const subfolderReady = Boolean(selectedLibrary && selectedSubfolder);

  const scopeLabel =
    selectedLibrary && selectedSubfolder
      ? isDirectFile
        ? `${selectedLibrary} / ${selectedSubfolder.split("/").pop() ?? selectedSubfolder}`
        : `${selectedLibrary} / ${selectedSubfolder}`
      : selectedLibrary
        ? `${selectedLibrary} — elige carpeta o documento`
        : "Elige biblioteca, carpeta y documento";

  const documentReady =
    selectedDocumentId !== NO_DOCUMENT_SENTINEL && selectedDocumentId.trim() !== "";

  const showDocumentPreview = subfolderReady && documentReady;
  const selectionReady = showDocumentPreview;

  const resetFromLibrary = () => {
    setSelectedLibrary("");
    setSelectedSubfolder("");
    setSelectedEntryKind("");
    setSelectedDocumentId(NO_DOCUMENT_SENTINEL);
    setEditLibrary(true);
    setEditChild(false);
    setEditDocument(false);
  };

  const resetFromChild = () => {
    setSelectedSubfolder("");
    setSelectedEntryKind("");
    setSelectedDocumentId(NO_DOCUMENT_SENTINEL);
    setEditChild(true);
    setEditDocument(false);
  };

  const resetFromDocument = () => {
    setSelectedDocumentId(NO_DOCUMENT_SENTINEL);
    setEditDocument(true);
  };

  const handleLibraryChange = (value: string) => {
    setSelectedLibrary(value);
    setSelectedSubfolder("");
    setSelectedEntryKind("");
    setSelectedDocumentId(NO_DOCUMENT_SENTINEL);
    if (value) {
      setEditLibrary(false);
      setEditChild(true);
      setEditDocument(false);
    } else {
      setEditLibrary(true);
      setEditChild(false);
      setEditDocument(false);
    }
  };

  const handleLibraryChildSelect = (entry: FolderEntry) => {
    setSelectedSubfolder(entry.name);
    setSelectedEntryKind(entry.kind);
    setEditChild(false);
    if (entry.kind === "file" && selectedLibrary) {
      setSelectedDocumentId(buildFolderPrefix(selectedLibrary, entry.name));
      setEditDocument(false);
    } else {
      setSelectedDocumentId(NO_DOCUMENT_SENTINEL);
      setEditDocument(true);
    }
  };

  const handleDocumentChange = (value: string) => {
    setSelectedDocumentId(value);
    if (value) setEditDocument(false);
  };

  const activeDocumentLabel =
    selectedDocumentId === NO_DOCUMENT_SENTINEL
      ? ""
      : selectedDocumentId.split("/").pop() ?? selectedDocumentId;

  const folderEntries = libraryChildren.filter((e) => e.kind === "directory");
  const fileEntries = libraryChildren.filter((e) => e.kind === "file");

  return (
    <main className="container">
      <section className="hero">
        <h1>Geobot</h1>
        <p>
          Selecciona en orden: biblioteca, carpeta o documento, y luego el archivo si aplica.
        </p>

        <div className="folder-picker">
          {libraryReady && !editLibrary && (
            <div className="selection-chip">
              <span className="selection-chip-label">Biblioteca</span>
              <span className="selection-chip-value">{selectedLibrary}</span>
              <button type="button" className="selection-chip-change" onClick={resetFromLibrary}>
                Cambiar
              </button>
            </div>
          )}

          {editLibrary && (
            <div className="folder-picker-row">
              <label htmlFor="library-select">Biblioteca:</label>
              <select
                id="library-select"
                className="folder-select"
                value={selectedLibrary}
                onChange={(event) => handleLibraryChange(event.target.value)}
                disabled={librariesLoading || libraries.length === 0}
              >
                <option value="">— Selecciona biblioteca —</option>
                {librariesLoading && <option value="" disabled>Cargando...</option>}
                {!librariesLoading && libraries.length === 0 && (
                  <option value="">(Sin bibliotecas en backend/data)</option>
                )}
                {libraries.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {subfolderReady && !editChild && (
            <div
              className={`selection-chip${
                selectedEntryKind === "directory" ? " selection-chip-folder" : ""
              }`}
            >
              <span className="selection-chip-label">
                {selectedEntryKind === "file" ? "Documento" : "Carpeta"}
              </span>
              <span className="selection-chip-value">{selectedSubfolder}</span>
              <button type="button" className="selection-chip-change" onClick={resetFromChild}>
                Cambiar
              </button>
            </div>
          )}

          {libraryReady && editChild && (
            <div className="folder-picker-row folder-picker-row-stack">
              <label htmlFor="subfolder-list">Carpeta o documento:</label>
              {libraryChildrenLoading ? (
                <p id="subfolder-list" className="library-children-placeholder">
                  Cargando...
                </p>
              ) : libraryChildren.length === 0 ? (
                <p id="subfolder-list" className="library-children-placeholder">
                  (Sin carpetas ni documentos)
                </p>
              ) : (
                <div id="subfolder-list" className="library-children-list" role="listbox" aria-label="Carpeta o documento">
                  {folderEntries.length > 0 && (
                    <p className="library-children-group-label">Carpetas</p>
                  )}
                  {folderEntries.map((entry) => (
                    <button
                      key={`dir-${entry.name}`}
                      type="button"
                      role="option"
                      aria-selected={selectedSubfolder === entry.name}
                      className={`library-child-btn library-child-folder${
                        selectedSubfolder === entry.name && selectedEntryKind === "directory"
                          ? " selected"
                          : ""
                      }`}
                      onClick={() => handleLibraryChildSelect(entry)}
                    >
                      {entry.name}
                    </button>
                  ))}
                  {fileEntries.length > 0 && (
                    <p className="library-children-group-label">Documentos</p>
                  )}
                  {fileEntries.map((entry) => (
                    <button
                      key={`file-${entry.name}`}
                      type="button"
                      role="option"
                      aria-selected={selectedSubfolder === entry.name}
                      className={`library-child-btn library-child-file${
                        selectedSubfolder === entry.name && selectedEntryKind === "file"
                          ? " selected"
                          : ""
                      }`}
                      onClick={() => handleLibraryChildSelect(entry)}
                    >
                      {entry.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {documentReady && !isDirectFile && !editDocument && (
            <div className="selection-chip">
              <span className="selection-chip-label">Documento activo</span>
              <span className="selection-chip-value">{activeDocumentLabel}</span>
              <button type="button" className="selection-chip-change" onClick={resetFromDocument}>
                Cambiar
              </button>
            </div>
          )}

          {subfolderReady && !isDirectFile && editDocument && (
            <div className="folder-picker-row">
              <label htmlFor="document-select">Documento activo:</label>
              <select
                id="document-select"
                className="folder-select"
                value={selectedDocumentId === NO_DOCUMENT_SENTINEL ? "" : selectedDocumentId}
                onChange={(event) => handleDocumentChange(event.target.value)}
                disabled={documentsLoading || documents.length === 0}
              >
                <option value="">
                  {documentsLoading
                    ? "Cargando..."
                    : documents.length === 0
                      ? "(Sin documentos)"
                      : "— Selecciona documento —"}
                </option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name.split("/").pop() ?? doc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!editLibrary && !editChild && !editDocument && documentReady && (
            <p className="folder-hint">
              Listo: <strong>{scopeLabel}</strong>
              {!isDirectFile ? <> · {activeDocumentLabel}</> : null}
            </p>
          )}

          {showDocumentPreview && (
            <DocumentPreview documentPath={selectedDocumentId} />
          )}
        </div>
      </section>

      {selectionReady && (
        <>
          <section className="smart-agent-section">
            <h2 className="section-title">Agente inteligente</h2>
            <p className="section-subtitle">
              Un solo chat. Elige el mejor modelo gratis (Gemini / Groq) o DeepSeek segun tu pregunta.
              Historial: ultimos 6 intercambios.
            </p>
            <SmartAgentPanel
              key={`smart-${selectedFolder}-${selectedDocumentId}`}
              selectedDocumentId={selectedDocumentId}
              selectedFolder={selectedFolder}
            />
          </section>

          <section>
            <h2 className="section-title">Comparacion por proveedor</h2>
            <p className="section-subtitle">Los 4 paneles individuales siguen disponibles.</p>
            <div className="agents-grid">
          <GeminiPanel
            key={`gemini-${selectedFolder}-${selectedDocumentId}`}
            selectedDocumentId={selectedDocumentId}
            selectedFolder={selectedFolder}
            className={AGENT_PANELS[0].cssClass}
            displayName={AGENT_PANELS[0].label}
          />

          <GroqPanel
            key={`groq-${selectedFolder}-${selectedDocumentId}`}
            selectedDocumentId={selectedDocumentId}
            selectedFolder={selectedFolder}
            className={AGENT_PANELS[1].cssClass}
            displayName={AGENT_PANELS[1].label}
          />

          <OllamaPanel
            key={`ollama-${selectedFolder}-${selectedDocumentId}`}
            selectedDocumentId={selectedDocumentId}
            selectedFolder={selectedFolder}
            className={AGENT_PANELS[2].cssClass}
            displayName={AGENT_PANELS[2].label}
          />

          <DeepSeekPanel
            key={`deepseek-${selectedFolder}-${selectedDocumentId}`}
            selectedDocumentId={selectedDocumentId}
            selectedFolder={selectedFolder}
            className={AGENT_PANELS[3].cssClass}
            displayName={AGENT_PANELS[3].label}
          />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
