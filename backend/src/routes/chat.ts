import { Router } from "express";
import {
  listCourseDocuments,
  listTopLevelFolders,
  loadCourseContext
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

    const [courseContext, inventoryItems, additionalSnippets] = await Promise.all([
      loadCourseContext({ courseId, documentId: selectedDocumentId }),
      listCourseDocuments(courseId, folderPrefix),
      searchAcrossDocuments({
        query: message,
        excludePath: selectedDocumentId,
        maxDocs: 3,
        folderPrefix
      })
    ]);

    const documentsInventory = inventoryItems.map((item) => item.id);
    const answer = await askTutor({
      message,
      courseContext,
      documentsInventory,
      activeDocumentPath: selectedDocumentId,
      additionalSnippets,
      provider
    });

    res.json({
      answer,
      meta: {
        courseId,
        documentId: selectedDocumentId,
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

export default router;
