import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AgentConfig {
  model: string;
  ollama_url: string;
  debug: boolean;
  max_loop_iterations: number;
  language: string;
}

const DEFAULT_CONFIG: AgentConfig = {
  model: "acidtib/qwen2.5-coder-cline:7b",
  ollama_url: "http://localhost:11434/api/generate",
  debug: false,
  max_loop_iterations: 1000,
  language: "auto",
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
