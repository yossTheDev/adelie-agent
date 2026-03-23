// System Actions

import type { ActionResult } from "../../../types/action-result.js";
import fs from "node:fs";
import { execSync } from "child_process";
import { getSystemContext } from "../../context/get-system-context.js";
import { listMcpServers } from "../../config/mcp-config.js";
import { callMcpTool } from "../../mcp/mcp-runtime.js";

export const systemTime = (): ActionResult => {
  try {
    return [true, new Date().toISOString()];
  } catch (e) {
    return [false, String(e)];
  }
};

export const runScript = (
  scriptPath: string,
  args: string[] = [],
): ActionResult => {
  try {
    if (!fs.existsSync(scriptPath))
      return [false, "Script file does not exist"];
    const output = execSync(`"${scriptPath}" ${args.join(" ")}`, {
      encoding: "utf-8",
    });
    return [true, output.trim()];
  } catch (e) {
    return [false, String(e)];
  }
};

export const systemInfo = (): ActionResult => {
  try {
    return [true, JSON.stringify(getSystemContext())];
  } catch (e) {
    return [false, String(e)];
  }
};

export const mcpRun = async (args: {
  server: string;
  tool: string;
  input?: string;
}): Promise<ActionResult> => {
  try {
    const serverName = String(args.server || "").trim();
    const toolName = String(args.tool || "").trim();
    if (!serverName || !toolName) {
      return [false, "MCP_RUN requires 'server' and 'tool'"];
    }

    const server = listMcpServers().find((s) => s.name === serverName);
    if (!server) return [false, `MCP server '${serverName}' not found`];

    if (server.tools.length > 0 && !server.tools.includes(toolName)) {
      return [false, `Tool '${toolName}' not registered for MCP server '${serverName}'`];
    }

    const response = await callMcpTool({
      server: serverName,
      tool: toolName,
      input: args.input,
    });
    return [true, JSON.stringify(response)];
  } catch (e) {
    return [false, `MCP_RUN Error: ${String(e)}`];
  }
};

export const ACTIONS: Record<
  string,
  (args: any) => ActionResult | Promise<ActionResult>
> = {
  SYSTEM_TIME: () => systemTime(),
  SYSTEM_INFO: () => systemInfo(),
  MCP_RUN: (args) => mcpRun(args),
  RUN_SCRIPT: (args) => runScript(args.path || "", args.args || []),
};

export const ACTION_ARGS: Record<string, string[]> = {
  SYSTEM_TIME: [],
  SYSTEM_INFO: [],
  MCP_RUN: ["server", "tool", "input"],
  RUN_SCRIPT: ["path", "args"],
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  SYSTEM_TIME: "Returns the current system date and time in ISO format.",
  SYSTEM_INFO:
    "Returns structured system information (user, OS, folders, network, env).",
  MCP_RUN:
    "Runs a registered MCP server tool by server/tool name and optional input payload.",
  RUN_SCRIPT:
    "Executes a local script with optional arguments and returns its output.",
};
