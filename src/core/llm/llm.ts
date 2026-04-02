import { providerManager } from "./provider-manager.js";

export async function callOllama(
  prompt: string,
  model?: string,
  stream: boolean = false,
): Promise<string | AsyncGenerator<string>> {
  return callLLM(prompt, model, stream);
}

export async function callLLM(
  prompt: string,
  provider?: string,
  stream: boolean = false,
): Promise<string | AsyncGenerator<string>> {
  const targetProvider = provider ? providerManager.getProvider(provider) : providerManager.getCurrentProvider();

  if (!targetProvider) {
    return stream ?
      (async function* () { yield "[Error: No provider available]"; })() :
      "[Error: No provider available]";
  }

  if (!targetProvider.validateConfig()) {
    return stream ?
      (async function* () { yield `[Error: ${targetProvider.name} provider not properly configured]`; })() :
      `[Error: ${targetProvider.name} provider not properly configured]`;
  }

  return targetProvider.callAPI(prompt, stream);
}
