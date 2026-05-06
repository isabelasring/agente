import { Router } from "express";
import { listCourseDocuments, loadCourseContext } from "../services/context.js";
import { askTutor } from "../services/llm.js";

type ChatBody = {
  message: string;
  courseId: string;
  documentId?: string;
  lessonId?: string;
};

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { message, courseId, documentId, lessonId } = req.body as Partial<ChatBody>;
    const selectedDocumentId = documentId || lessonId;

    if (!message || !courseId || !selectedDocumentId) {
      res.status(400).json({
        error: "Debes enviar message, courseId y documentId."
      });
      return;
    }

    const courseContext = await loadCourseContext({ courseId, documentId: selectedDocumentId });
    const answer = await askTutor({ message, courseContext });

    res.json({
      answer,
      meta: {
        courseId,
        documentId: selectedDocumentId,
        contextLoaded: Boolean(courseContext)
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
