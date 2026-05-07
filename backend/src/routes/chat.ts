import { Router } from "express";
import { listCourseDocuments, loadCourseContext } from "../services/context.js";
import { searchAcrossDocuments } from "../services/search.js";
import { askTutor, type LlmProvider } from "../services/llm.js";

type ChatBody = {
  message: string;
  courseId: string;
  documentId?: string;
  lessonId?: string;
  provider?: LlmProvider;
};

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { message, courseId, documentId, lessonId, provider } = req.body as Partial<ChatBody>;
    const selectedDocumentId = documentId || lessonId;

    if (!message || !courseId || !selectedDocumentId) {
      res.status(400).json({
        error: "Debes enviar message, courseId y documentId."
      });
      return;
    }

    const [courseContext, inventoryItems, additionalSnippets] = await Promise.all([
      loadCourseContext({ courseId, documentId: selectedDocumentId }),
      listCourseDocuments(courseId),
      searchAcrossDocuments({ query: message, excludePath: selectedDocumentId, maxDocs: 3 })
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

  const documents = await listCourseDocuments(courseId);
  res.json({
    courseId,
    documents
  });
});

export default router;
