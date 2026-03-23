import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type McpServer = {
  name: string;
  command: string;
  args: string[];
  tools: string[];
  installed_at: string;
};

type McpConfig = {
  servers: McpServer[];
};

const CONFIG_DIR = path.join(os.homedir(), ".yi-agente");
const MCP_CONFIG_PATH = path.join(CONFIG_DIR, "mcp.json");

const ensureMcpConfig = (): void => {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  if (!fs.existsSync(MCP_CONFIG_PATH)) {
    const initial: McpConfig = { servers: [] };
    fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(initial, null, 2), "utf-8");
  }
};

const readMcpConfig = (): McpConfig => {
  ensureMcpConfig();
  try {
    const raw = fs.readFileSync(MCP_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<McpConfig>;
    return { servers: Array.isArray(parsed.servers) ? parsed.servers : [] };
  } catch {
    return { servers: [] };
  }
};

const writeMcpConfig = (next: McpConfig): void => {
  ensureMcpConfig();
  fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
};

export const getMcpConfigPath = (): string => MCP_CONFIG_PATH;

export const listMcpServers = (): McpServer[] => {
  return readMcpConfig().servers;
};

export const installMcpServer = (args: {
  name: string;
  command: string;
  commandArgs?: string[];
  tools?: string[];
}): McpServer => {
  const config = readMcpConfig();
  const withoutExisting = config.servers.filter((s) => s.name !== args.name);
  const server: McpServer = {
    name: args.name,
    command: args.command,
    args: args.commandArgs || [],
    tools: args.tools || [],
    installed_at: new Date().toISOString(),
  };
  const next: McpConfig = { servers: [...withoutExisting, server] };
  writeMcpConfig(next);
  return server;
};

export const buildMcpPlannerToolsText = (): string => {
  const servers = listMcpServers();
  if (servers.length === 0) return "No MCP servers installed.";

  const lines: string[] = [];
  for (const server of servers) {
    if (!server.tools || server.tools.length === 0) {
      lines.push(`- ${server.name}: no declared tools`);
      continue;
    }
    for (const tool of server.tools) {
      lines.push(`- ${server.name}.${tool}`);
    }
  }

  return lines.join("\n");
};

export const removeMcpServer = (name: string): boolean => {
  const config = readMcpConfig();
  const next = config.servers.filter((s) => s.name !== name);
  if (next.length === config.servers.length) return false;
  writeMcpConfig({ servers: next });
  return true;
};
