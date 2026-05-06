import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";

type ContextInput = {
  courseId: string;
  documentId: string;
};

export async function loadCourseContext({
  courseId,
  documentId
}: ContextInput): Promise<string> {
  const safeCourseId = sanitizePathPart(courseId);
  const safeDocumentId = sanitizePathPart(documentId);
  const coursePath = getCoursePath(safeCourseId);
  const candidateFiles = SUPPORTED_EXTENSIONS.map((extension) =>
    path.join(coursePath, `${safeDocumentId}${extension}`)
  );

  for (const filePath of candidateFiles) {
    const content = await readDocumentContent(filePath);
    if (content.trim()) {
      return content;
    }
  }

  return "";
}

export async function listCourseDocuments(courseId: string): Promise<DocumentItem[]> {
  const safeCourseId = sanitizePathPart(courseId);
  const coursePath = getCoursePath(safeCourseId);

  try {
    const entries = await fs.readdir(coursePath, { withFileTypes: true });
    const documents = entries
      .filter((entry) => entry.isFile())
      .map((entry) => toDocumentItem(entry.name))
      .filter((item): item is DocumentItem => Boolean(item))
      .sort((a, b) => a.name.localeCompare(b.name));
    return documents;
  } catch {
    return [];
  }
}

export type DocumentItem = {
  id: string;
  name: string;
  extension: SupportedExtension;
};

type SupportedExtension = ".md" | ".txt" | ".docx" | ".pdf";

const SUPPORTED_EXTENSIONS: SupportedExtension[] = [".md", ".txt", ".docx", ".pdf"];

function getCoursePath(safeCourseId: string): string {
  return path.join(process.cwd(), "data", "cursos", safeCourseId);
}

async function readDocumentContent(filePath: string): Promise<string> {
  try {
    const extension = path.extname(filePath).toLowerCase() as SupportedExtension;

    if (extension === ".md" || extension === ".txt") {
      return await fs.readFile(filePath, "utf8");
    }

    if (extension === ".docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.trim();
    }

    if (extension === ".pdf") {
      const fileBuffer = await fs.readFile(filePath);
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: fileBuffer });
      const result = await parser.getText();
      await parser.destroy();
      return result.text.trim();
    }

    return "";
  } catch {
    return "";
  }
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, "");
}

function toDocumentItem(fileName: string): DocumentItem | null {
  const extension = path.extname(fileName).toLowerCase() as SupportedExtension;
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return null;
  }

  return {
    id: path.basename(fileName, extension),
    name: fileName,
    extension
  };
}
