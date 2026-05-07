# Agente Educativo Local (MVP)

Este proyecto crea un agente local enfocado en dudas del curso, preparado para integrar despues Open edX y Vtiger via API desde el backend.

## Stack

- Frontend: Next.js + React + TypeScript
- Backend: Node.js + Express + TypeScript
- LLM: OpenAI API (configurable)

## Estructura

- `frontend/`: interfaz de chat
- `backend/`: API del agente
- Documentos: carpeta configurable con `GEOTRENDS_DOCUMENTS_ROOT` en `backend/.env` (por defecto `data/geotrends`). Se indexa **toda** la carpeta en profundidad (txt, md, docx, pdf, xlsx); `GET /documents` devuelve rutas relativas tipo `subcarpeta/archivo.txt`.

## Ejecutar

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
# agrega OPENAI_API_KEY en .env
npm run dev
```

Servidor en `http://localhost:4000`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

UI en `http://localhost:3000`.

## Endpoint principal

`POST /api/chat`

Body:

```json
{
  "message": "Que es un buffer?",
  "courseId": "geotrends",
  "documentId": "000_IA_Scripts/ejemplo.txt"
}
```

## Nota de integracion futura

Cuando conecten Open edX y Vtiger, solo cambian la capa de `context.ts` para traer contexto real por API. El frontend no necesita cambios grandes.
