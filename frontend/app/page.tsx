"use client";

import { useState } from "react";
import GeminiPanel from "../gemini/GeminiPanel";
import GroqPanel from "../groq/GroqPanel";
import HuggingFacePanel from "../huggingface/HuggingFacePanel";
import OllamaPanel from "../ollama/OllamaPanel";
import OpenAIPanel from "../openai/OpenAIPanel";
import DeepSeekPanel from "../deepseek/DeepSeekPanel";
import { ALL_FOLDERS_SENTINEL, DEFAULT_DOCUMENT_ID } from "../shared/agentConfig";
import { useCourseDocuments, useTopLevelFolders } from "../shared/useCourseDocuments";

const AGENT_PANELS = [
  { label: "Gemini", cssClass: "agent-gemini" },
  { label: "Groq", cssClass: "agent-groq" },
  { label: "Hugging Face", cssClass: "agent-huggingface" },
  { label: "Ollama", cssClass: "agent-ollama" },
  { label: "OpenAI", cssClass: "agent-openai" },
  { label: "DeepSeek", cssClass: "agent-deepseek" }
] as const;

export default function HomePage() {
  const [selectedFolder, setSelectedFolder] = useState<string>(ALL_FOLDERS_SENTINEL);
  const [selectedDocumentId, setSelectedDocumentId] = useState(DEFAULT_DOCUMENT_ID);
  const { documents, documentsLoading } = useCourseDocuments(
    selectedDocumentId,
    setSelectedDocumentId,
    selectedFolder
  );
  const { folders, foldersLoading } = useTopLevelFolders();

  const folderLabel =
    selectedFolder === ALL_FOLDERS_SENTINEL ? "Todas las carpetas" : selectedFolder;

  return (
    <main className="container">
      <section className="hero">
        <h1>Geobot</h1>
        <p>
          Soy tu agente. Selecciona una carpeta y un documento, y respondere tus preguntas con base en su
          contenido.
        </p>

        <div className="folder-picker">
          <div className="folder-picker-row">
            <label htmlFor="folder-select">
              Carpeta a analizar:
            </label>
            <select
              id="folder-select"
              className="folder-select"
              value={selectedFolder}
              onChange={(event) => setSelectedFolder(event.target.value)}
              disabled={foldersLoading}
            >
              <option value={ALL_FOLDERS_SENTINEL}>Todas las carpetas</option>
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
          </div>

          <div className="folder-picker-row">
            <label htmlFor="document-select">
              Documento activo:
            </label>
            <select
              id="document-select"
              className="folder-select"
              value={selectedDocumentId}
              onChange={(event) => setSelectedDocumentId(event.target.value)}
              disabled={documentsLoading || documents.length === 0}
            >
              {documents.length === 0 ? (
                <option value="">(Sin documentos disponibles)</option>
              ) : (
                documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <p className="folder-hint">
            Carpeta: <strong>{folderLabel}</strong> · {documents.length} documento(s) indexado(s).
          </p>
        </div>
      </section>

      <section className="agents-grid">
        <GeminiPanel
          selectedDocumentId={selectedDocumentId}
          selectedFolder={selectedFolder}
          className={AGENT_PANELS[0].cssClass}
          displayName={AGENT_PANELS[0].label}
        />

        <GroqPanel
          selectedDocumentId={selectedDocumentId}
          selectedFolder={selectedFolder}
          className={AGENT_PANELS[1].cssClass}
          displayName={AGENT_PANELS[1].label}
        />

        <HuggingFacePanel
          selectedDocumentId={selectedDocumentId}
          selectedFolder={selectedFolder}
          className={AGENT_PANELS[2].cssClass}
          displayName={AGENT_PANELS[2].label}
        />

        <OllamaPanel
          selectedDocumentId={selectedDocumentId}
          selectedFolder={selectedFolder}
          className={AGENT_PANELS[3].cssClass}
          displayName={AGENT_PANELS[3].label}
        />

        <OpenAIPanel
          selectedDocumentId={selectedDocumentId}
          selectedFolder={selectedFolder}
          className={AGENT_PANELS[4].cssClass}
          displayName={AGENT_PANELS[4].label}
        />

        <DeepSeekPanel
          selectedDocumentId={selectedDocumentId}
          selectedFolder={selectedFolder}
          className={AGENT_PANELS[5].cssClass}
          displayName={AGENT_PANELS[5].label}
        />
      </section>
    </main>
  );
}
