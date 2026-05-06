"use client";

type Props = {
  className?: string;
  displayName?: string;
};

export default function OllamaPanel({ className = "", displayName = "Ollama" }: Props) {
  return (
    <div className={`phone-shell placeholder-shell ${className}`.trim()}>
      <header className="chat-header">
        <img className="bot-avatar" src="/agent-avatar.png" alt="Avatar del agente" />
        <div>
          <strong>
            Tutor Virtual - <span className="agent-name">{displayName}</span>
          </strong>
          <p>En linea</p>
        </div>
      </header>
      <div className="placeholder-content">
        <p>Chat de {displayName}: UI en frontend/ollama/ — integracion pendiente.</p>
        <p>Codigo de API: backend/src/ollama/askOllama.ts</p>
      </div>
    </div>
  );
}
