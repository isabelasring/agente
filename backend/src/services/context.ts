import fs from "node:fs/promises";
import path from "node:path";

type ContextInput = {
  courseId: string;
  lessonId: string;
};

export async function loadCourseContext({
  courseId,
  lessonId
}: ContextInput): Promise<string> {
  const safeCourseId = sanitizePathPart(courseId);
  const safeLessonId = sanitizePathPart(lessonId);
  const filePath = path.join(
    process.cwd(),
    "data",
    "cursos",
    safeCourseId,
    `${safeLessonId}.md`
  );

  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, "");
}
