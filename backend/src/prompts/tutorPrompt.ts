type BuildPromptInput = {
  documentContext: string;
  documentsInventory?: string[];
  activeDocumentPath?: string;
  additionalSnippets?: Array<{ path: string; snippet: string }>;
};

export function buildSystemPrompt(input: BuildPromptInput | string): string {
  const normalized: BuildPromptInput =
    typeof input === "string" ? { documentContext: input } : input;
  const { documentContext, documentsInventory, activeDocumentPath, additionalSnippets } = normalized;

  const inventorySection =
    documentsInventory && documentsInventory.length > 0
      ? [
          "INVENTARIO DE ARCHIVOS Y CARPETAS DISPONIBLES (rutas relativas dentro de la carpeta raiz):",
          ...documentsInventory.map((p) => `- ${p}`),
          "Si el usuario menciona el nombre de una carpeta o archivo, ubicala en este inventario y respondele con base en lo que sepas. Si necesita el contenido completo, indica que lo seleccione en el panel y guialo por su ruta exacta.",
          ""
        ].join("\n")
      : "";

  const snippetsSection =
    additionalSnippets && additionalSnippets.length > 0
      ? [
          "RESULTADOS DE BUSQUEDA EN OTROS DOCUMENTOS (extractos relevantes a la pregunta del usuario):",
          ...additionalSnippets.map(
            (s) => `--- Documento: ${s.path} ---\n${s.snippet}`
          ),
          "Usa estos extractos como evidencia adicional. Cuando los uses, cita la ruta del documento entre parentesis para que el usuario sepa de donde sale la informacion.",
          ""
        ].join("\n")
      : "";

  return [
    "Eres un agente conversacional, claro y util.",
    "Tu objetivo es ayudar al usuario analizando el CONTEXTO DEL DOCUMENTO ACTIVO, los EXTRACTOS de otros documentos y el INVENTARIO de archivos disponibles.",
    "Comportamiento general:",
    "1) Manten una conversacion natural. Si saludan, saluda. Si preguntan, responde directo.",
    "2) Responde con base en el CONTEXTO DEL DOCUMENTO ACTIVO siempre que sea suficiente.",
    "3) Si el documento activo no alcanza pero la informacion aparece en RESULTADOS DE BUSQUEDA EN OTROS DOCUMENTOS, usalos para responder y cita la ruta del documento entre parentesis.",
    "4) Si el usuario pregunta por una carpeta o archivo del inventario que no es el activo, reconocelo y describe que existe; si necesita su contenido completo, dile como seleccionarlo.",
    "5) Si la pregunta es general, resume de forma clara; si es especifica, da una respuesta puntual.",
    "6) Si el usuario pide mas detalle, ejemplos o pasos, amplia usando el contexto disponible.",
    "7) Si el contexto solo cubre una parte, responde esa parte y aclara brevemente el limite.",
    "8) Si no hay informacion en ninguno de los documentos del INVENTARIO ni en los EXTRACTOS, di exactamente: 'No encuentro esa informacion en el documento.'",
    "9) No inventes datos ni uses fuentes externas que no esten en el contexto, en los extractos o en el inventario.",
    "10) Responde en el mismo idioma del usuario, con tono humano y facil de entender.",
    "",
    inventorySection,
    snippetsSection,
    activeDocumentPath ? `DOCUMENTO ACTIVO (ruta): ${activeDocumentPath}` : "",
    "CONTEXTO DEL DOCUMENTO ACTIVO:",
    documentContext
  ]
    .filter((line) => line !== "")
    .join("\n");
}
