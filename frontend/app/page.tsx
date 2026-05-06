"use client";

import { useMemo, useState } from "react";
import GeminiPanel from "../gemini/GeminiPanel";
import GroqPanel from "../groq/GroqPanel";
import HuggingFacePanel from "../huggingface/HuggingFacePanel";
import OllamaPanel from "../ollama/OllamaPanel";
import { DEFAULT_DOCUMENT_ID } from "../shared/agentConfig";
import { useCourseDocuments } from "../shared/useCourseDocuments";

const AGENT_PANELS = [
  { label: "Gemini", cssClass: "agent-gemini" },
  { label: "Groq", cssClass: "agent-groq" },
  { label: "Hugging Face", cssClass: "agent-huggingface" },
  { label: "Ollama", cssClass: "agent-ollama" }
] as const;

export default function HomePage() {
  const [selectedDocumentId, setSelectedDocumentId] = useState(DEFAULT_DOCUMENT_ID);
  const { documents, documentsLoading } = useCourseDocuments(selectedDocumentId, setSelectedDocumentId);

  const memoGeminiProps = useMemo(
    () => ({
      documents,
      documentsLoading,
      selectedDocumentId,
      onSelectedDocumentChange: setSelectedDocumentId
    }),
    [documents, documentsLoading, selectedDocumentId]
  );

  return (
    <main className="container">
      <section className="hero">
        <h1>Geobot</h1>
        <p>Soy tu agente de apoyo para resolver dudas del curso de forma clara y rapida.</p>
      </section>

      <section className="agents-grid">
        <GeminiPanel {...memoGeminiProps} className={AGENT_PANELS[0].cssClass} displayName={AGENT_PANELS[0].label} />

        <GroqPanel
          selectedDocumentId={selectedDocumentId}
          className={AGENT_PANELS[1].cssClass}
          displayName={AGENT_PANELS[1].label}
        />

        <HuggingFacePanel className={AGENT_PANELS[2].cssClass} displayName={AGENT_PANELS[2].label} />

        <OllamaPanel className={AGENT_PANELS[3].cssClass} displayName={AGENT_PANELS[3].label} />
      </section>
    </main>
  );
}
