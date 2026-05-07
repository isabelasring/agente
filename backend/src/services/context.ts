import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";

/** Debe coincidir con `NO_DOCUMENT_SENTINEL` en el frontend cuando no hay .pdf/.md/.txt/.docx indexables */
const NO_INDEXED_DOCUMENT_SENTINEL = "__geotrends_no_doc__";

type ContextInput = {
  courseId: string;
  documentId: string;
};

export async function loadCourseContext({
  documentId
}: ContextInput): Promise<string> {
  const trimmed = documentId.trim();
  if (trimmed === "" || trimmed === NO_INDEXED_DOCUMENT_SENTINEL) {
    return "";
  }

  const root = getDocumentsRootPath();
  const rawId = trimmed.replace(/\\/g, "/");

  const ext = path.extname(rawId).toLowerCase() as SupportedExtension;
  if (SUPPORTED_EXTENSIONS.includes(ext)) {
    const full = safeResolveUnderRoot(root, rawId);
    if (full) {
      const content = await readDocumentContent(full);
      if (content.trim()) return content;
    }
  }

  for (const extension of SUPPORTED_EXTENSIONS) {
    const full = safeResolveUnderRoot(root, `${rawId}${extension}`);
    if (!full) continue;
    const content = await readDocumentContent(full);
    if (content.trim()) return content;
  }

  return "";
}

export async function listCourseDocuments(_courseId: string): Promise<DocumentItem[]> {
  const root = getDocumentsRootPath();
  try {
    const flat = await collectDocumentsRecursive(root, "");
    return flat.sort((a, b) => a.name.localeCompare(b.name));
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

const IGNORED_FILE_NAMES = new Set(["desktop.ini", "thumbs.db", ".ds_store"]);

/**
 * Carpeta local que se indexa entera (recursivo): md, txt, docx, pdf.
 * GEOTRENDS_DOCUMENTS_ROOT: ruta relativa al cwd del backend (ej. data/cursos/geo-basico/geotrends)
 * o ruta absoluta en Windows/Linux.
 */
function getDocumentsRootPath(): string {
  const raw = process.env.GEOTRENDS_DOCUMENTS_ROOT?.trim();
  if (raw) {
    const cleaned = raw.replace(/^["']|["']$/g, "");
    if (path.isAbsolute(cleaned)) {
      return path.normalize(cleaned);
    }
    return path.normalize(path.join(process.cwd(), cleaned));
  }
  return path.join(process.cwd(), "data", "geotrends");
}

async function collectDocumentsRecursive(
  dir: string,
  relativePosix: string
): Promise<DocumentItem[]> {
  const out: DocumentItem[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dir, entry.name);
    const rel =
      relativePosix === "" ? entry.name : `${relativePosix}/${entry.name}`;
    const relPosix = rel.replace(/\\/g, "/");

    if (entry.isDirectory()) {
      out.push(...(await collectDocumentsRecursive(fullPath, relPosix)));
      continue;
    }

    if (!entry.isFile()) continue;
    if (IGNORED_FILE_NAMES.has(entry.name.toLowerCase())) continue;

    const item = fileToDocumentItem(relPosix);
    if (item) out.push(item);
  }

  return out;
}

function fileToDocumentItem(relativePathPosix: string): DocumentItem | null {
  const extension = path.extname(relativePathPosix).toLowerCase() as SupportedExtension;
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return null;
  }

  return {
    id: relativePathPosix,
    name: relativePathPosix,
    extension
  };
}

/** Evita salir de `root` (path traversal). `relativePosix` usa barras `/`. */
function safeResolveUnderRoot(root: string, relativePosix: string): string | null {
  const trimmed = relativePosix.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.includes("\0")) return null;

  const segments = trimmed.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg === ".." || seg === ".") return null;
  }

  const candidate = path.resolve(root, ...segments);
  const rootResolved = path.resolve(root);
  const rel = path.relative(rootResolved, candidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;

  return candidate;
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
