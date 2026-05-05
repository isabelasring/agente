# Agente Educativo Local (MVP)

Este proyecto crea un agente local enfocado en dudas del curso, preparado para integrar despues Open edX y Vtiger via API desde el backend.

## Stack

- Frontend: Next.js + React + TypeScript
- Backend: Node.js + Express + TypeScript
- LLM: OpenAI API (configurable)

## Estructura

- `frontend/`: interfaz de chat
- `backend/`: API del agente
- `backend/data/cursos/`: contenido local del curso

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
  "courseId": "geo-basico",
  "lessonId": "leccion-1"
}
```

## Nota de integracion futura

Cuando conecten Open edX y Vtiger, solo cambian la capa de `context.ts` para traer contexto real por API. El frontend no necesita cambios grandes.
