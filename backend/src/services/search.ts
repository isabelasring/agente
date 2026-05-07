import {
  getDocumentsRootPath,
  listCourseDocuments,
  readDocumentContent,
  safeResolveUnderRoot
} from "./context.js";

export type DocumentSnippet = {
  path: string;
  snippet: string;
  score: number;
};

const STOPWORDS = new Set([
  "a", "al", "ante", "bajo", "cabe", "con", "contra", "de", "del", "desde",
  "durante", "en", "entre", "hacia", "hasta", "mediante", "para", "por", "segun",
  "sin", "so", "sobre", "tras", "versus", "via", "y", "e", "o", "u", "ni",
  "que", "como", "cuando", "donde", "porque", "pero", "si", "no", "es", "son",
  "el", "la", "los", "las", "un", "una", "unos", "unas", "lo", "su", "sus",
  "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas", "tu", "mi",
  "me", "te", "se", "le", "les", "nos", "ya", "muy", "mas", "menos", "poco",
  "mucho", "todo", "todos", "toda", "todas", "algo", "algun", "alguna",
  "the", "a", "an", "of", "in", "on", "is", "and", "or", "with", "by"
]);

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^a-z0-9_]+/i)
    .filter((tok) => tok.length >= 3 && !STOPWORDS.has(tok));
}

function normalizeText(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export type SearchOptions = {
  query: string;
  excludePath?: string;
  maxDocs?: number;
  snippetChars?: number;
  folderPrefix?: string;
};

/**
 * Busca palabras del `query` en TODOS los documentos indexados (excepto el activo).
 * Devuelve hasta `maxDocs` snippets, ordenados por relevancia.
 *
 * Heurística simple sin embeddings:
 *   - Tokeniza el query (filtra stopwords y palabras < 3 chars).
 *   - Para cada documento: cuenta apariciones de cada token en (filename + contenido).
 *   - Score = suma de apariciones; bonus si el token coincide con el filename.
 */
export async function searchAcrossDocuments(options: SearchOptions): Promise<DocumentSnippet[]> {
  const { query, excludePath, maxDocs = 3, snippetChars = 1200, folderPrefix } = options;
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const root = getDocumentsRootPath();
  const inventory = await listCourseDocuments("", folderPrefix);
  const candidates = inventory.filter((item) => item.id !== excludePath);

  const scored: DocumentSnippet[] = [];

  for (const item of candidates) {
    const fullPath = safeResolveUnderRoot(root, item.id);
    if (!fullPath) continue;

    const content = await readDocumentContent(fullPath);
    if (!content) continue;

    const haystack = normalizeText(content);
    const filename = normalizeText(item.id);

    let score = 0;
    let firstHitIndex = -1;

    for (const token of tokens) {
      const inFilename = filename.includes(token);
      if (inFilename) score += 5;

      let from = 0;
      while (true) {
        const idx = haystack.indexOf(token, from);
        if (idx === -1) break;
        score += 1;
        if (firstHitIndex === -1 || idx < firstHitIndex) firstHitIndex = idx;
        from = idx + token.length;
        if (from - haystack.indexOf(token) > 200_000) break;
      }
    }

    if (score === 0) continue;

    const start = firstHitIndex === -1 ? 0 : Math.max(0, firstHitIndex - 300);
    const end = Math.min(content.length, start + snippetChars);
    const snippet = content.slice(start, end).replace(/\s+/g, " ").trim();

    scored.push({ path: item.id, snippet, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxDocs);
}
