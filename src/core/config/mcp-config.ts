import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type McpServer = {
  name: string;
  command?: string;
  args?: string[];
  tools: string[];
  env: Record<string, string>;
  package?: string;
  installed_at: string;
  type?: "stdio" | "http";
  url?: string;
  headers?: Record<string, string>;
  auth?: {
    type?: "bearer" | "basic";
    token?: string;
    username?: string;
    password?: string;
  };
};

type McpConfig = {
  servers: McpServer[];
};

const CONFIG_DIR = path.join(os.homedir(), ".adelie");
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
  command?: string;
  commandArgs?: string[];
  tools?: string[];
  env?: Record<string, string>;
  packageName?: string;
  type?: "stdio" | "http";
  url?: string;
  headers?: Record<string, string>;
  auth?: {
    type?: "bearer" | "basic";
    token?: string;
    username?: string;
    password?: string;
  };
}): McpServer => {
  const config = readMcpConfig();
  const withoutExisting = config.servers.filter((s) => s.name !== args.name);
  const server: McpServer = {
    name: args.name,
    command: args.command,
    args: args.commandArgs || [],
    tools: args.tools || [],
    env: args.env || {},
    package: args.packageName,
    installed_at: new Date().toISOString(),
    type: args.type || "stdio",
    url: args.url,
    headers: args.headers,
    auth: args.auth,
  };
  const next: McpConfig = { servers: [...withoutExisting, server] };
  writeMcpConfig(next);
  return server;
};

export const updateMcpServerEnv = (
  name: string,
  envPatch: Record<string, string>,
): McpServer | null => {
  const config = readMcpConfig();
  const target = config.servers.find((s) => s.name === name);
  if (!target) return null;
  target.env = { ...(target.env || {}), ...envPatch };
  writeMcpConfig(config);
  return target;
};

export const syncMcpServerTools = (
  name: string,
  tools: string[],
): McpServer | null => {
  const config = readMcpConfig();
  const target = config.servers.find((s) => s.name === name);
  if (!target) return null;
  target.tools = tools;
  writeMcpConfig(config);
  return target;
};

export const buildMcpPlannerToolsText = async (): Promise<string> => {
  const servers = listMcpServers();
  if (servers.length === 0) return "No MCP servers installed.";

  // Get real tools from MCP servers using SDK
  const { McpClientManager } = await import("../mcp/mcp-client.js");
  const lines: string[] = [];
  
  for (const server of servers) {
    try {
      console.log(`🔍 Getting tools from server: ${server.name}`);
      const tools = await McpClientManager.getServerTools(server.name);
      
      if (tools.length > 0) {
        for (const tool of tools) {
          const description = tool.description || `Tool from ${server.name} server`;
          lines.push(`- ${server.name}.${tool.name}: ${description}`);
        }
        console.log(`✅ Found ${tools.length} tools for server: ${server.name}`);
      } else {
        // Fallback to server's declared tools if no real tools available
        if (server.tools && server.tools.length > 0) {
          for (const tool of server.tools) {
            lines.push(`- ${server.name}.${tool}: Tool from ${server.name} server (declared)`);
          }
        } else {
          lines.push(`- ${server.name}: no tools available`);
        }
        console.log(`⚠️ No tools found for server: ${server.name}`);
      }
    } catch (error) {
      console.warn(`Failed to get tools from server '${server.name}':`, error);
      
      // Fallback to declared tools
      if (server.tools && server.tools.length > 0) {
        for (const tool of server.tools) {
          lines.push(`- ${server.name}.${tool}: Tool from ${server.name} server (fallback)`);
        }
      } else {
        lines.push(`- ${server.name}: connection failed`);
      }
    }
  }

  return lines.length > 0 ? lines.join("\n") : "No MCP tools available.";
};

export const removeMcpServer = (name: string): boolean => {
  const config = readMcpConfig();
  const next = config.servers.filter((s) => s.name !== name);
  if (next.length === config.servers.length) return false;
  writeMcpConfig({ servers: next });
  return true;
};
