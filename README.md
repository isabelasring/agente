# Geobot / Agente Educativo Local (MVP)

Tutor sobre documentos locales (PDF, DOCX, XLSX, MD, TXT) con varios LLMs y un **agente inteligente** que elige Gemini, Groq o DeepSeek según la complejidad de la pregunta.

> **Documentación completa de entrega:**
> - Markdown: **[DOCUMENTACION-HANDOFF.md](./DOCUMENTACION-HANDOFF.md)**
> - PDF: **[DOCUMENTACION-HANDOFF.pdf](./DOCUMENTACION-HANDOFF.pdf)**
>
> Estructura, APIs, cada LLM, flujo smart, env vars y checklist para el sucesor.

## Stack

- **Frontend:** Next.js 14 + React + TypeScript (`frontend/`)
- **Backend:** Node.js + Express + TypeScript (`backend/`)
- **LLMs:** Gemini, Groq, DeepSeek, Ollama
- **Documentos:** carpeta local `GEOTRENDS_DOCUMENTS_ROOT` (por defecto `backend/data/`)

## Arranque rápido

### 1) Backend (puerto 3001)

```bash
cd backend
npm install
cp .env.example .env
# Agrega GEMINI_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY (según uses)
npm run dev
```

### 2) Frontend (puerto 3000)

```bash
cd frontend
npm install
# .env.local: NEXT_PUBLIC_AGENT_API_URL=http://localhost:3001/api/chat
npm run dev
```

UI: `http://localhost:3000` · Health: `http://localhost:3001/health`

## Estructura

| Ruta | Rol |
|------|-----|
| `frontend/` | UI: wizard de documentos, Smart agent, paneles por proveedor |
| `backend/src/routes/chat.ts` | API REST (`/api/chat`, folders, documents, preview) |
| `backend/src/services/providerRouter.ts` | Auto-route Smart (complejidad → LLM) |
| `backend/src/services/llm.ts` | Orquestador `askTutor` / `askSmartTutor` |
| `backend/src/gemini\|groq\|deepseek\|…` | Adapters de cada API |
| `backend/data/` | Bibliotecas documentales |

## Endpoint principal

`POST /api/chat`

```json
{
  "message": "¿De qué trata este documento?",
  "courseId": "geotrends",
  "documentId": "Manuales/archivo.pdf",
  "folder": "Manuales",
  "provider": "auto",
  "autoRoute": true,
  "history": []
}
```

- `provider: "auto"` + `autoRoute: true` → agente inteligente.
- `provider: "gemini" | "groq" | "deepseek" | …` → panel fijo.

## Idea del agente inteligente

| Tipo de pregunta | Modelo típico |
|------------------|---------------|
| Corta / directa (“qué es”, “título”…) | **Groq** (rápido) |
| Analítica / detallada / seguimiento | **DeepSeek** |
| Documento muy grande o fallback | **Gemini** |

Detalle de reglas, integración y mapa de archivos: **[DOCUMENTACION-HANDOFF.md](./DOCUMENTACION-HANDOFF.md)** · **[PDF](./DOCUMENTACION-HANDOFF.pdf)**.

## Integración futura

Cuando conecten Open edX / Vtiger, el punto de extensión natural es `backend/src/services/context.ts` (traer contexto por API). El frontend no necesita cambios grandes.
