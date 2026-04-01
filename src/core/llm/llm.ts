import { callLLM } from "./provider-manager.js";

export async function callOllama(
  prompt: string,
  model?: string,
  stream: boolean = false,
): Promise<string | AsyncGenerator<string>> {
  return callLLM(prompt, model, stream);
}
