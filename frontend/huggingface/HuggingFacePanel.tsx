"use client";

type Props = {
  className?: string;
  displayName?: string;
};

export default function HuggingFacePanel({
  className = "",
  displayName = "Hugging Face"
}: Props) {
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
        <p>Chat de {displayName}: UI en frontend/huggingface/ — integracion pendiente.</p>
        <p>Codigo de API: backend/src/huggingface/askHuggingFace.ts</p>
      </div>
    </div>
  );
}
