import OpenAI from "openai";
import { buildSystemPrompt } from "../prompts/tutorPrompt.js";

type AskTutorInput = {
  message: string;
  courseContext: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function askTutor({ message, courseContext }: AskTutorInput): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return "Falta configurar OPENAI_API_KEY en el backend.";
  }

  if (!courseContext.trim()) {
    return "No encuentro esa informacion en el contenido del curso.";
  }

  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content: buildSystemPrompt(courseContext)
      },
      {
        role: "user",
        content: message
      }
    ]
  });

  return response.output_text?.trim() || "No encuentro esa informacion en el contenido del curso.";
}
