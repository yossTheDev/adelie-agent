import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AgentConfig {
  model: string;
  ollama_url: string;
  debug: boolean;
  max_loop_iterations: number;
  language: string;
  conversation_memory_length: number;
  provider: 'ollama' | 'openai' | 'google' | 'openrouter' | 'anthropic' | 'cohere' | 'groq' | 'mistral' | 'together' | 'custom';
  providers: {
    ollama: {
      url: string;
      model: string;
    };
    openai: {
      api_key: string;
      model: string;
      base_url?: string;
    };
    google: {
      api_key: string;
      model: string;
    };
    openrouter: {
      api_key: string;
      model: string;
      base_url?: string;
    };
    anthropic: {
      api_key: string;
      model: string;
      base_url?: string;
    };
    cohere: {
      api_key: string;
      model: string;
      base_url?: string;
    };
    groq: {
      api_key: string;
      model: string;
      base_url?: string;
    };
    mistral: {
      api_key: string;
      model: string;
      base_url?: string;
    };
    together: {
      api_key: string;
      model: string;
      base_url?: string;
    };
    custom: {
      api_key?: string;
      model: string;
      base_url: string;
      headers?: Record<string, string>;
      auth_type?: 'bearer' | 'api-key' | 'custom';
      custom_auth?: string;
    };
  };
}

const DEFAULT_CONFIG: AgentConfig = {
  model: "acidtib/qwen2.5-coder-cline:7b",
  ollama_url: "http://localhost:11434/api/generate",
  debug: false,
  max_loop_iterations: 1000,
  language: "auto",
  conversation_memory_length: 10,
  provider: 'ollama',
  providers: {
    ollama: {
      url: "http://localhost:11434/api/generate",
      model: "acidtib/qwen2.5-coder-cline:7b"
    },
    openai: {
      api_key: "",
      model: "gpt-4",
      base_url: "https://api.openai.com/v1"
    },
    google: {
      api_key: "",
      model: "gemini-pro"
    },
    openrouter: {
      api_key: "",
      model: "anthropic/claude-3.5-sonnet",
      base_url: "https://openrouter.ai/api/v1"
    },
    anthropic: {
      api_key: "",
      model: "claude-3-5-sonnet-20241022",
      base_url: "https://api.anthropic.com/v1"
    },
    cohere: {
      api_key: "",
      model: "command-r-plus",
      base_url: "https://api.cohere.ai/v1"
    },
    groq: {
      api_key: "",
      model: "llama-3.1-70b-versatile",
      base_url: "https://api.groq.com/openai/v1"
    },
    mistral: {
      api_key: "",
      model: "mistral-large-latest",
      base_url: "https://api.mistral.ai/v1"
    },
    together: {
      api_key: "",
      model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      base_url: "https://api.together.xyz/v1"
    },
    custom: {
      model: "",
      base_url: "",
      headers: {},
      auth_type: "bearer"
    }
  }
};

const CONFIG_DIR = path.join(os.homedir(), ".adelie");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

const ensureConfigFile = (): void => {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
  }
};

export const getAgentConfigPaths = () => ({
  configDir: CONFIG_DIR,
  configPath: CONFIG_PATH,
});

export const getDefaultAgentConfig = (): AgentConfig => ({ ...DEFAULT_CONFIG });

export const readAgentConfig = (): AgentConfig => {
  ensureConfigFile();
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AgentConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      max_loop_iterations:
        typeof parsed.max_loop_iterations === "number"
          ? parsed.max_loop_iterations
          : DEFAULT_CONFIG.max_loop_iterations,
      conversation_memory_length:
        typeof parsed.conversation_memory_length === "number"
          ? parsed.conversation_memory_length
          : DEFAULT_CONFIG.conversation_memory_length,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
};

export const writeAgentConfig = (patch: Partial<AgentConfig>): AgentConfig => {
  ensureConfigFile();
  const current = readAgentConfig();
  const next: AgentConfig = {
    ...current,
    ...patch,
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
  return next;
};

export const resetAgentConfig = (): AgentConfig => {
  ensureConfigFile();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
  return { ...DEFAULT_CONFIG };
};
