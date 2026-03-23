import { readAgentConfig } from "./config/agent-config.js";

const runtime = readAgentConfig();

export const OLLAMA_URL = runtime.ollama_url;
export const MODEL = runtime.model;
