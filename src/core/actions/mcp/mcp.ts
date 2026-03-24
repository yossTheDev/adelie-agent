import type { ActionResult } from "../../../types/action-result.js";
import { McpInstaller } from "../../mcp/mcp-installer.js";

/**
 * Executes a tool from an MCP server
 */
export const mcpRun = async (args: {
  server: string;
  tool: string;
  input?: Record<string, any>;
}): Promise<ActionResult> => {
  try {
    if (!args.server || !args.tool) {
      return [false, "MCP_RUN requires 'server' and 'tool' parameters"];
    }

    // Check if server is installed
    const installedServers = await McpInstaller.listInstalledServers();
    if (!installedServers.includes(args.server)) {
      return [false, `MCP server '${args.server}' is not installed. Use 'yi mcp install ${args.server}' first.`];
    }

    // Get server configuration
    const serverInfo = await McpInstaller.getServerInfo(args.server);
    if (!serverInfo) {
      return [false, `Failed to get configuration for MCP server '${args.server}'`];
    }

    // For now, return a placeholder response
    // In a full implementation, this would:
    // 1. Connect to the MCP server
    // 2. Call the specified tool with the given input
    // 3. Return the tool's response
    
    const inputJson = args.input ? JSON.stringify(args.input, null, 2) : "{}";
    
    return [
      true, 
      `MCP execution simulated:\n` +
      `Server: ${args.server}\n` +
      `Tool: ${args.tool}\n` +
      `Input: ${inputJson}\n` +
      `Note: Full MCP execution not yet implemented`
    ];
  } catch (error) {
    return [false, `MCP_RUN Error: ${String(error)}`];
  }
};

export const ACTIONS = {
  MCP_RUN: mcpRun,
};

export const ACTION_ARGS = {
  MCP_RUN: ["server", "tool", "input"],
};

export const ACTION_DESCRIPTIONS = {
  MCP_RUN: "Executes a tool from a configured MCP server with specified input parameters",
};
