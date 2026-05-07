"use client";

import { useState } from "react";
import GeminiPanel from "../gemini/GeminiPanel";
import GroqPanel from "../groq/GroqPanel";
import HuggingFacePanel from "../huggingface/HuggingFacePanel";
import OllamaPanel from "../ollama/OllamaPanel";
import OpenAIPanel from "../openai/OpenAIPanel";
import DeepSeekPanel from "../deepseek/DeepSeekPanel";
import { DEFAULT_DOCUMENT_ID } from "../shared/agentConfig";
import { useCourseDocuments } from "../shared/useCourseDocuments";

const AGENT_PANELS = [
  { label: "Gemini", cssClass: "agent-gemini" },
  { label: "Groq", cssClass: "agent-groq" },
  { label: "Hugging Face", cssClass: "agent-huggingface" },
  { label: "Ollama", cssClass: "agent-ollama" },
  { label: "OpenAI", cssClass: "agent-openai" },
  { label: "DeepSeek", cssClass: "agent-deepseek" }
] as const;

export default function HomePage() {
  const [selectedDocumentId, setSelectedDocumentId] = useState(DEFAULT_DOCUMENT_ID);
  useCourseDocuments(selectedDocumentId, setSelectedDocumentId);

  return (
    <main className="container">
      <section className="hero">
        <h1>Geobot</h1>
        <p>Soy tu agente. Analizo el documento que selecciones y respondo tus preguntas con base en su contenido.</p>
      </section>

      <section className="agents-grid">
        <GeminiPanel
          selectedDocumentId={selectedDocumentId}
          className={AGENT_PANELS[0].cssClass}
          displayName={AGENT_PANELS[0].label}
        />

        <GroqPanel
          selectedDocumentId={selectedDocumentId}
          className={AGENT_PANELS[1].cssClass}
          displayName={AGENT_PANELS[1].label}
        />

        <HuggingFacePanel
          selectedDocumentId={selectedDocumentId}
          className={AGENT_PANELS[2].cssClass}
          displayName={AGENT_PANELS[2].label}
        />

        <OllamaPanel
          selectedDocumentId={selectedDocumentId}
          className={AGENT_PANELS[3].cssClass}
          displayName={AGENT_PANELS[3].label}
        />

        <OpenAIPanel
          selectedDocumentId={selectedDocumentId}
          className={AGENT_PANELS[4].cssClass}
          displayName={AGENT_PANELS[4].label}
        />

        <DeepSeekPanel
          selectedDocumentId={selectedDocumentId}
          className={AGENT_PANELS[5].cssClass}
          displayName={AGENT_PANELS[5].label}
        />
      </section>
    </main>
  );
}
