import { Router } from "express";
import { loadCourseContext } from "../services/context.js";
import { askTutor } from "../services/llm.js";

type ChatBody = {
  message: string;
  courseId: string;
  lessonId: string;
};

const router = Router();

router.post("/chat", async (req, res) => {
  const { message, courseId, lessonId } = req.body as Partial<ChatBody>;

  if (!message || !courseId || !lessonId) {
    res.status(400).json({
      error: "Debes enviar message, courseId y lessonId."
    });
    return;
  }

  const courseContext = await loadCourseContext({ courseId, lessonId });
  const answer = await askTutor({ message, courseContext });

  res.json({
    answer,
    meta: {
      courseId,
      lessonId,
      contextLoaded: Boolean(courseContext)
    }
  });
});

export default router;
