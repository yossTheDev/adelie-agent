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
