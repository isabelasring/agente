import { AskProviderInput } from "../shared/llmTypes.js";

/**
 * Pendiente de integracion: aqui ira Inference API / router de Hugging Face.
 */
export async function askHuggingFace(_input: AskProviderInput): Promise<string> {
  return "Integracion Hugging Face pendiente. Agrega HF_API_* y modelo en esta carpeta (huggingface/).";
}
