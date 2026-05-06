import { AskProviderInput } from "../shared/llmTypes.js";

/**
 * Pendiente de integracion: aqui ira llamada a Ollama (localhost).
 */
export async function askOllama(_input: AskProviderInput): Promise<string> {
  return "Integracion Ollama pendiente. Levanta ollama y configura OLLAMA_* en esta carpeta (ollama/).";
}
