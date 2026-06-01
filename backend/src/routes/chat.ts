import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import {
  getDocumentsRootPath,
  listCourseDocuments,
  listFolderEntries,
  listTopLevelFolders,
  loadCourseContext,
  readDocumentContent,
  safeResolveUnderRoot
} from "../services/context.js";
import { searchAcrossDocuments } from "../services/search.js";
import { askSmartTutor, askTutor, type LlmProvider } from "../services/llm.js";
import { normalizeHistory } from "../shared/chatHistory.js";
import { providerLabel, type RoutedProvider } from "../services/providerRouter.js";

type ChatBody = {
  message: string;
  courseId: string;
  documentId?: string;
  lessonId?: string;
  provider?: LlmProvider;
  folder?: string;
  autoRoute?: boolean;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { message, courseId, documentId, lessonId, provider, folder, autoRoute, history } =
      req.body as Partial<ChatBody>;
    const selectedDocumentId = documentId || lessonId;

    if (!message || !courseId || !selectedDocumentId) {
      res.status(400).json({
        error: "Debes enviar message, courseId y documentId."
      });
      return;
    }

    const folderPrefix = folder?.trim() || undefined;
    const chatHistory = normalizeHistory(history);
    const useAutoRoute = autoRoute === true || provider === "auto";
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

    const tutorPayload = {
      message,
      courseContext,
      documentsInventory,
      activeDocumentPath: resolvedDocumentId,
      additionalSnippets,
      history: chatHistory
    };

    let answer: string;
    let resolvedProvider: string;
    let routingReason: string | null = null;

    if (useAutoRoute) {
      const smart = await askSmartTutor(tutorPayload);
      answer = smart.answer;
      resolvedProvider = smart.provider;
      routingReason = smart.routingReason;
    } else {
      answer = await askTutor({ ...tutorPayload, provider: provider || "gemini" });
      resolvedProvider = provider || "gemini";
    }

    res.json({
      answer,
      meta: {
        courseId,
        documentId: resolvedDocumentId,
        provider: resolvedProvider,
        providerLabel: useAutoRoute
          ? providerLabel(resolvedProvider as RoutedProvider)
          : resolvedProvider,
        autoRoute: useAutoRoute,
        routingReason,
        historyMessages: chatHistory.length,
        folder: folderPrefix || null,
        contextLoaded: Boolean(courseContext),
        contextChars: courseContext.length,
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

router.get("/folders", async (req, res) => {
  const rawParent = typeof req.query.parent === "string" ? req.query.parent.trim() : "";
  const parent = rawParent || undefined;
  if (!parent) {
    const folders = await listTopLevelFolders();
    res.json({ folders, parent: null });
    return;
  }
  const entries = await listFolderEntries(parent);
  res.json({
    folders: entries.filter((e) => e.kind === "directory").map((e) => e.name),
    entries,
    parent
  });
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

/** Texto extraido para vista previa de docx, txt, md, xlsx (no PDF). */
router.get("/document/text", async (req, res) => {
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

  const ext = path.extname(fullPath).toLowerCase();
  if (ext === ".pdf") {
    res.status(400).json({ error: "Para PDF usa /document con iframe." });
    return;
  }

  try {
    const text = await readDocumentContent(fullPath);
    const maxChars = 80_000;
    const truncated = text.length > maxChars;
    res.json({
      path: rawPath,
      extension: ext,
      text: truncated ? text.slice(0, maxChars) : text,
      truncated
    });
  } catch {
    res.status(404).json({ error: "No se pudo leer el documento." });
  }
});

/** HTML para vista previa (xlsx como tabla). */
router.get("/document/html", async (req, res) => {
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

  const ext = path.extname(fullPath).toLowerCase();
  if (ext !== ".xlsx") {
    res.status(400).json({ error: "Solo xlsx usa /document/html." });
    return;
  }

  try {
    const buffer = await fs.readFile(fullPath);
    const { default: XLSX } = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const parts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const tableHtml = XLSX.utils.sheet_to_html(sheet, { id: `sheet-${sheetName}` });
      parts.push(`<section class="xlsx-sheet"><h2>${sheetName}</h2>${tableHtml}</section>`);
    }
    res.json({ path: rawPath, extension: ext, html: parts.join("") || "<p>(Hoja vacia)</p>" });
  } catch {
    res.status(404).json({ error: "No se pudo leer el documento." });
  }
});

export default router;
