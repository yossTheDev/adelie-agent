import { readAgentConfig } from "../config/agent-config.js";

export interface LLMResponse {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface LLMProvider {
  name: string;
  callAPI(prompt: string, stream?: boolean): Promise<string | AsyncGenerator<string>>;
  validateConfig(): boolean;
}

class OllamaProvider implements LLMProvider {
  name = "ollama";

  async callAPI(prompt: string, stream: boolean = false): Promise<string | AsyncGenerator<string>> {
    const config = readAgentConfig();
    const providerConfig = config.providers.ollama;

    if (stream) {
      return this._streamGenerator(prompt, providerConfig.model, providerConfig.url);
    }

    try {
      const response = await fetch(providerConfig.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: providerConfig.model,
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

  private async* _streamGenerator(
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

  validateConfig(): boolean {
    const config = readAgentConfig();
    const providerConfig = config.providers.ollama;
    return !!(providerConfig.url && providerConfig.model);
  }
}

class OpenAIProvider implements LLMProvider {
  name = "openai";

  async callAPI(prompt: string, stream: boolean = false): Promise<string | AsyncGenerator<string>> {
    const config = readAgentConfig();
    const providerConfig = config.providers.openai;

    if (!providerConfig.api_key) {
      return "[Error: OpenAI API key not configured]";
    }

    const baseUrl = providerConfig.base_url || "https://api.openai.com/v1";

    if (stream) {
      return this._streamGenerator(prompt, providerConfig.model, providerConfig.api_key, baseUrl);
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${providerConfig.api_key}`,
        },
        body: JSON.stringify({
          model: providerConfig.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        return `[Error: OpenAI API request failed with status ${response.status}]`;
      }

      const data = await response.json();
      return (data as any).choices?.[0]?.message?.content || "[Error: No response from OpenAI]";
    } catch (e) {
      return `[Error calling OpenAI: ${e}]`;
    }
  }

  private async* _streamGenerator(
    prompt: string,
    model: string,
    apiKey: string,
    baseUrl: string,
  ): AsyncGenerator<string> {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          stream: true,
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
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (e) {
      yield `[Error streaming from OpenAI: ${e}]`;
    }
  }

  validateConfig(): boolean {
    const config = readAgentConfig();
    const providerConfig = config.providers.openai;
    return !!(providerConfig.api_key && providerConfig.model);
  }
}

class GoogleProvider implements LLMProvider {
  name = "google";

  async callAPI(prompt: string, stream: boolean = false): Promise<string | AsyncGenerator<string>> {
    const config = readAgentConfig();
    const providerConfig = config.providers.google;

    if (!providerConfig.api_key) {
      return "[Error: Google API key not configured]";
    }

    if (stream) {
      return this._streamGenerator(prompt, providerConfig.model, providerConfig.api_key);
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${providerConfig.model}:generateContent?key=${providerConfig.api_key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0 },
        }),
      });

      if (!response.ok) {
        return `[Error: Google API request failed with status ${response.status}]`;
      }

      const data = await response.json();
      return (data as any).candidates?.[0]?.content?.parts?.[0]?.text || "[Error: No response from Google]";
    } catch (e) {
      return `[Error calling Google: ${e}]`;
    }
  }

  private async* _streamGenerator(
    prompt: string,
    model: string,
    apiKey: string,
  ): AsyncGenerator<string> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0 },
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
            const content = (data as any).candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) yield content;
          } catch {
            // Ignore parsing errors
          }
        }
      }
    } catch (e) {
      yield `[Error streaming from Google: ${e}]`;
    }
  }

  validateConfig(): boolean {
    const config = readAgentConfig();
    const providerConfig = config.providers.google;
    return !!(providerConfig.api_key && providerConfig.model);
  }
}

class OpenRouterProvider implements LLMProvider {
  name = "openrouter";

  async callAPI(prompt: string, stream: boolean = false): Promise<string | AsyncGenerator<string>> {
    const config = readAgentConfig();
    const providerConfig = config.providers.openrouter;

    if (!providerConfig.api_key) {
      return "[Error: OpenRouter API key not configured]";
    }

    const baseUrl = providerConfig.base_url || "https://openrouter.ai/api/v1";

    if (stream) {
      return this._streamGenerator(prompt, providerConfig.model, providerConfig.api_key, baseUrl);
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${providerConfig.api_key}`,
          "HTTP-Referer": "https://adelie.ai",
          "X-Title": "Adelie AI Assistant",
        },
        body: JSON.stringify({
          model: providerConfig.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        return `[Error: OpenRouter API request failed with status ${response.status}]`;
      }

      const data = await response.json();
      return (data as any).choices?.[0]?.message?.content || "[Error: No response from OpenRouter]";
    } catch (e) {
      return `[Error calling OpenRouter: ${e}]`;
    }
  }

  private async* _streamGenerator(
    prompt: string,
    model: string,
    apiKey: string,
    baseUrl: string,
  ): AsyncGenerator<string> {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://adelie.ai",
          "X-Title": "Adelie AI Assistant",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          stream: true,
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
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              const content = (parsed as any).choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (e) {
      yield `[Error streaming from OpenRouter: ${e}]`;
    }
  }

  validateConfig(): boolean {
    const config = readAgentConfig();
    const providerConfig = config.providers.openrouter;
    return !!(providerConfig.api_key && providerConfig.model);
  }
}

class AnthropicProvider implements LLMProvider {
  name = "anthropic";

  async callAPI(prompt: string, stream: boolean = false): Promise<string | AsyncGenerator<string>> {
    const config = readAgentConfig();
    const providerConfig = config.providers.anthropic;

    if (!providerConfig.api_key) {
      return "[Error: Anthropic API key not configured]";
    }

    const baseUrl = providerConfig.base_url || "https://api.anthropic.com/v1";

    if (stream) {
      return this._streamGenerator(prompt, providerConfig.model, providerConfig.api_key, baseUrl);
    }

    try {
      const response = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": providerConfig.api_key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: providerConfig.model,
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        return `[Error: Anthropic API request failed with status ${response.status}]`;
      }

      const data = await response.json();
      return (data as any).content?.[0]?.text || "[Error: No response from Anthropic]";
    } catch (e) {
      return `[Error calling Anthropic: ${e}]`;
    }
  }

  private async* _streamGenerator(
    prompt: string,
    model: string,
    apiKey: string,
    baseUrl: string,
  ): AsyncGenerator<string> {
    try {
      const response = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          stream: true,
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
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta") {
                const content = parsed.delta?.text;
                if (content) yield content;
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (e) {
      yield `[Error streaming from Anthropic: ${e}]`;
    }
  }

  validateConfig(): boolean {
    const config = readAgentConfig();
    const providerConfig = config.providers.anthropic;
    return !!(providerConfig.api_key && providerConfig.model);
  }
}

class CohereProvider implements LLMProvider {
  name = "cohere";

  async callAPI(prompt: string, stream: boolean = false): Promise<string | AsyncGenerator<string>> {
    const config = readAgentConfig();
    const providerConfig = config.providers.cohere;

    if (!providerConfig.api_key) {
      return "[Error: Cohere API key not configured]";
    }

    const baseUrl = providerConfig.base_url || "https://api.cohere.ai/v1";

    if (stream) {
      return this._streamGenerator(prompt, providerConfig.model, providerConfig.api_key, baseUrl);
    }

    try {
      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${providerConfig.api_key}`,
        },
        body: JSON.stringify({
          model: providerConfig.model,
          message: prompt,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        return `[Error: Cohere API request failed with status ${response.status}]`;
      }

      const data = await response.json();
      return (data as any).text || "[Error: No response from Cohere]";
    } catch (e) {
      return `[Error calling Cohere: ${e}]`;
    }
  }

  private async* _streamGenerator(
    prompt: string,
    model: string,
    apiKey: string,
    baseUrl: string,
  ): AsyncGenerator<string> {
    try {
      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          message: prompt,
          temperature: 0,
          stream: true,
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
            if (data.type === "text-generation") {
              const content = data.text;
              if (content) yield content;
            }
          } catch {
            // Ignore parsing errors
          }
        }
      }
    } catch (e) {
      yield `[Error streaming from Cohere: ${e}]`;
    }
  }

  validateConfig(): boolean {
    const config = readAgentConfig();
    const providerConfig = config.providers.cohere;
    return !!(providerConfig.api_key && providerConfig.model);
  }
}

class GroqProvider implements LLMProvider {
  name = "groq";

  async callAPI(prompt: string, stream: boolean = false): Promise<string | AsyncGenerator<string>> {
    const config = readAgentConfig();
    const providerConfig = config.providers.groq;

    if (!providerConfig.api_key) {
      return "[Error: Groq API key not configured]";
    }

    const baseUrl = providerConfig.base_url || "https://api.groq.com/openai/v1";

    if (stream) {
      return this._streamGenerator(prompt, providerConfig.model, providerConfig.api_key, baseUrl);
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${providerConfig.api_key}`,
        },
        body: JSON.stringify({
          model: providerConfig.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        return `[Error: Groq API request failed with status ${response.status}]`;
      }

      const data = await response.json();
      return (data as any).choices?.[0]?.message?.content || "[Error: No response from Groq]";
    } catch (e) {
      return `[Error calling Groq: ${e}]`;
    }
  }

  private async* _streamGenerator(
    prompt: string,
    model: string,
    apiKey: string,
    baseUrl: string,
  ): AsyncGenerator<string> {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          stream: true,
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
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              const content = (parsed as any).choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (e) {
      yield `[Error streaming from Groq: ${e}]`;
    }
  }

  validateConfig(): boolean {
    const config = readAgentConfig();
    const providerConfig = config.providers.groq;
    return !!(providerConfig.api_key && providerConfig.model);
  }
}

class MistralProvider implements LLMProvider {
  name = "mistral";

  async callAPI(prompt: string, stream: boolean = false): Promise<string | AsyncGenerator<string>> {
    const config = readAgentConfig();
    const providerConfig = config.providers.mistral;

    if (!providerConfig.api_key) {
      return "[Error: Mistral API key not configured]";
    }

    const baseUrl = providerConfig.base_url || "https://api.mistral.ai/v1";

    if (stream) {
      return this._streamGenerator(prompt, providerConfig.model, providerConfig.api_key, baseUrl);
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${providerConfig.api_key}`,
        },
        body: JSON.stringify({
          model: providerConfig.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        return `[Error: Mistral API request failed with status ${response.status}]`;
      }

      const data = await response.json();
      return (data as any).choices?.[0]?.message?.content || "[Error: No response from Mistral]";
    } catch (e) {
      return `[Error calling Mistral: ${e}]`;
    }
  }

  private async* _streamGenerator(
    prompt: string,
    model: string,
    apiKey: string,
    baseUrl: string,
  ): AsyncGenerator<string> {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          stream: true,
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
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              const content = (parsed as any).choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (e) {
      yield `[Error streaming from Mistral: ${e}]`;
    }
  }

  validateConfig(): boolean {
    const config = readAgentConfig();
    const providerConfig = config.providers.mistral;
    return !!(providerConfig.api_key && providerConfig.model);
  }
}

class TogetherProvider implements LLMProvider {
  name = "together";

  async callAPI(prompt: string, stream: boolean = false): Promise<string | AsyncGenerator<string>> {
    const config = readAgentConfig();
    const providerConfig = config.providers.together;

    if (!providerConfig.api_key) {
      return "[Error: Together API key not configured]";
    }

    const baseUrl = providerConfig.base_url || "https://api.together.xyz/v1";

    if (stream) {
      return this._streamGenerator(prompt, providerConfig.model, providerConfig.api_key, baseUrl);
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${providerConfig.api_key}`,
        },
        body: JSON.stringify({
          model: providerConfig.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        return `[Error: Together API request failed with status ${response.status}]`;
      }

      const data = await response.json();
      return (data as any).choices?.[0]?.message?.content || "[Error: No response from Together]";
    } catch (e) {
      return `[Error calling Together: ${e}]`;
    }
  }

  private async* _streamGenerator(
    prompt: string,
    model: string,
    apiKey: string,
    baseUrl: string,
  ): AsyncGenerator<string> {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          stream: true,
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
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              const content = (parsed as any).choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (e) {
      yield `[Error streaming from Together: ${e}]`;
    }
  }

  validateConfig(): boolean {
    const config = readAgentConfig();
    const providerConfig = config.providers.together;
    return !!(providerConfig.api_key && providerConfig.model);
  }
}

class CustomProvider implements LLMProvider {
  name = "custom";

  async callAPI(prompt: string, stream: boolean = false): Promise<string | AsyncGenerator<string>> {
    const config = readAgentConfig();
    const providerConfig = config.providers.custom;

    if (!providerConfig.base_url || !providerConfig.model) {
      return "[Error: Custom provider base_url and model must be configured]";
    }

    if (stream) {
      return this._streamGenerator(prompt, providerConfig);
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...providerConfig.headers,
      };

      // Add authentication
      if (providerConfig.api_key) {
        switch (providerConfig.auth_type) {
          case "bearer":
            headers["Authorization"] = `Bearer ${providerConfig.api_key}`;
            break;
          case "api-key":
            headers["X-API-Key"] = providerConfig.api_key;
            break;
          case "custom":
            if (providerConfig.custom_auth) {
              const [key, value] = providerConfig.custom_auth.split(":");
              headers[key.trim()] = value.trim();
            }
            break;
        }
      }

      const response = await fetch(providerConfig.base_url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: providerConfig.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        return `[Error: Custom provider API request failed with status ${response.status}]`;
      }

      const data = await response.json();
      return (data as any).choices?.[0]?.message?.content ||
        (data as any).content?.[0]?.text ||
        (data as any).response ||
        "[Error: Unexpected response format from custom provider]";
    } catch (e) {
      return `[Error calling custom provider: ${e}]`;
    }
  }

  private async* _streamGenerator(
    prompt: string,
    providerConfig: any,
  ): AsyncGenerator<string> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...providerConfig.headers,
      };

      // Add authentication
      if (providerConfig.api_key) {
        switch (providerConfig.auth_type) {
          case "bearer":
            headers["Authorization"] = `Bearer ${providerConfig.api_key}`;
            break;
          case "api-key":
            headers["X-API-Key"] = providerConfig.api_key;
            break;
          case "custom":
            if (providerConfig.custom_auth) {
              const [key, value] = providerConfig.custom_auth.split(":");
              headers[key.trim()] = value.trim();
            }
            break;
        }
      }

      const response = await fetch(providerConfig.base_url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: providerConfig.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          stream: true,
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
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              const content = (parsed as any).choices?.[0]?.delta?.content ||
                (parsed as any).delta?.text ||
                (parsed as any).content;
              if (content) yield content;
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (e) {
      yield `[Error streaming from custom provider: ${e}]`;
    }
  }

  validateConfig(): boolean {
    const config = readAgentConfig();
    const providerConfig = config.providers.custom;
    return !!(providerConfig.base_url && providerConfig.model);
  }
}

class LLMProviderManager {
  private providers: Map<string, LLMProvider> = new Map();

  constructor() {
    this.providers.set("ollama", new OllamaProvider());
    this.providers.set("openai", new OpenAIProvider());
    this.providers.set("google", new GoogleProvider());
    this.providers.set("openrouter", new OpenRouterProvider());
    this.providers.set("anthropic", new AnthropicProvider());
    this.providers.set("cohere", new CohereProvider());
    this.providers.set("groq", new GroqProvider());
    this.providers.set("mistral", new MistralProvider());
    this.providers.set("together", new TogetherProvider());
    this.providers.set("custom", new CustomProvider());
  }

  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  getCurrentProvider(): LLMProvider | undefined {
    const config = readAgentConfig();
    return this.getProvider(config.provider);
  }

  validateCurrentProvider(): boolean {
    const provider = this.getCurrentProvider();
    return provider ? provider.validateConfig() : false;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getValidatedProviders(): { name: string; valid: boolean }[] {
    return this.getAvailableProviders().map(name => ({
      name,
      valid: this.getProvider(name)?.validateConfig() || false
    }));
  }
}

export const providerManager = new LLMProviderManager();

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
