import { readAgentConfig } from "../config/agent-config.js";

async function* _ollamaStreamGenerator(
  prompt: string,
  model: string,
  ollamaUrl: string,
): AsyncGenerator<string> {
  try {
    const response = await fetch(ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: { temperature: 0 },
      }),
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.response) yield data.response;
        } catch {
          yield line;
        }
      }
    }
  } catch (e) {
    yield `[Error streaming response: ${e}]`;
  }
}

export async function callOllama(
  prompt: string,
  model?: string,
  stream: boolean = false,
): Promise<string | AsyncGenerator<string>> {
  const runtime = readAgentConfig();
  const selectedModel = model || runtime.model;
  const ollamaUrl = runtime.ollama_url;

  if (stream) {
    return _ollamaStreamGenerator(prompt, selectedModel, ollamaUrl);
  }

  try {
    const response = await fetch(ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        prompt,
        stream: false,
        options: { temperature: 0 },
      }),
    });

    const data = await response.json();
    return (
      (data as any).response ||
      `[Error: no 'response' in API output, got ${JSON.stringify(data)}]`
    );
  } catch (e) {
    return `[Error calling Ollama: ${e}]`;
  }
}
