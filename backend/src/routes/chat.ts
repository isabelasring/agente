import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import {
  getDocumentsRootPath,
  listCourseDocuments,
  listTopLevelFolders,
  loadCourseContext,
  safeResolveUnderRoot
} from "../services/context.js";
import { searchAcrossDocuments } from "../services/search.js";
import { askTutor, type LlmProvider } from "../services/llm.js";

type ChatBody = {
  message: string;
  courseId: string;
  documentId?: string;
  lessonId?: string;
  provider?: LlmProvider;
  folder?: string;
};

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { message, courseId, documentId, lessonId, provider, folder } = req.body as Partial<ChatBody>;
    const selectedDocumentId = documentId || lessonId;

    if (!message || !courseId || !selectedDocumentId) {
      res.status(400).json({
        error: "Debes enviar message, courseId y documentId."
      });
      return;
    }

    const folderPrefix = folder?.trim() || undefined;
    const inventoryItems = await listCourseDocuments(courseId, folderPrefix);
    const resolvedDocumentId =
      inventoryItems.some((item) => item.id === selectedDocumentId)
        ? selectedDocumentId
        : (inventoryItems[0]?.id ?? selectedDocumentId);

    const [courseContext, additionalSnippets] = await Promise.all([
      loadCourseContext({ courseId, documentId: resolvedDocumentId }),
      searchAcrossDocuments({
        query: message,
        excludePath: resolvedDocumentId,
        maxDocs: 3,
        folderPrefix
      })
    ]);
    console.log(
      `[chat] folder=${folderPrefix || "ALL"} requested=${selectedDocumentId} resolved=${resolvedDocumentId} contextLen=${courseContext.trim().length} inventory=${inventoryItems.length}`
    );

    const documentsInventory = inventoryItems.map((item) => item.id);
    const answer = await askTutor({
      message,
      courseContext,
      documentsInventory,
      activeDocumentPath: resolvedDocumentId,
      additionalSnippets,
      provider
    });

    res.json({
      answer,
      meta: {
        courseId,
        documentId: resolvedDocumentId,
        provider: provider || "gemini",
        folder: folderPrefix || null,
        contextLoaded: Boolean(courseContext),
        inventorySize: documentsInventory.length,
        searchHits: additionalSnippets.map((s) => ({ path: s.path, score: s.score }))
      }
    });
  } catch {
    res.status(500).json({
      error: "Ocurrio un error al procesar tu mensaje."
    });
  }
});

router.get("/documents", async (req, res) => {
  const courseId = String(req.query.courseId || "");
  if (!courseId) {
    res.status(400).json({
      error: "Debes enviar courseId como query param."
    });
    return;
  }

  const rawFolder = typeof req.query.folder === "string" ? req.query.folder : "";
  const folder = rawFolder.trim() || undefined;

  const documents = await listCourseDocuments(courseId, folder);
  res.json({
    courseId,
    folder: folder || null,
    documents
  });
});

router.get("/folders", async (_req, res) => {
  const folders = await listTopLevelFolders();
  res.json({ folders });
});

router.get("/document", async (req, res) => {
  const rawPath = String(req.query.path || "").trim();
  if (!rawPath) {
    res.status(400).json({ error: "Debes enviar path como query param." });
    return;
  }

  const root = getDocumentsRootPath();
  const fullPath = safeResolveUnderRoot(root, rawPath);
  if (!fullPath) {
    res.status(400).json({ error: "Ruta de documento invalida." });
    return;
  }

  try {
    const buffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : ext === ".xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : ext === ".md" || ext === ".txt"
              ? "text/plain; charset=utf-8"
              : "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  } catch {
    res.status(404).json({ error: "No se encontro el documento." });
  }
});

export default router;
