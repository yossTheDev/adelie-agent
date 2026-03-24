import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { McpServer, McpPreset } from "../skills/skill-types.js";
import { MCP_PRESETS, getPreset, getAllPresets, resolveEnvironmentVariables } from "./mcp-presets.js";
import { installPresetSkills } from "./preset-skills.js";
import { 
  listMcpServers, 
  installMcpServer as installServerConfig, 
  removeMcpServer as removeServerConfig,
  updateMcpServerEnv,
  syncMcpServerTools,
  getMcpConfigPath
} from "../config/mcp-config.js";
import { McpClientManager } from "./mcp-client.js";

const execAsync = promisify(exec);

export class McpInstaller {
  private static readonly CONFIG_DIR = path.join(os.homedir(), ".adelie");
  private static readonly CLAUDE_CONFIG_FILE = path.join(os.homedir(), ".claude_desktop_config.json");

  static ensureConfigDirectory(): void {
    if (!fs.existsSync(this.CONFIG_DIR)) {
      fs.mkdirSync(this.CONFIG_DIR, { recursive: true });
    }
  }

  static async installPreset(presetName: string): Promise<{ success: boolean; error?: string }> {
    const preset = getPreset(presetName);
    if (!preset) {
      return { success: false, error: `Preset '${presetName}' not found` };
    }

    this.ensureConfigDirectory();

    try {
      // Install servers from preset using unified config
      for (const server of preset.servers) {
        installServerConfig({
          name: server.name,
          command: server.command,
          commandArgs: server.args,
          env: server.env ? resolveEnvironmentVariables(server.env) : undefined,
          tools: [] // Will be populated when skills are installed
        });
      }

      // Install associated skills
      const skillsResult = await installPresetSkills(presetName);
      if (!skillsResult.success) {
        console.warn(`Warning: Failed to install skills for preset ${presetName}: ${skillsResult.error}`);
      }

      // Auto-sync tools for all servers in this preset
      for (const server of preset.servers) {
        await this.autoSyncTools(server.name);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to install preset: ${String(error)}` };
    }
  }

  static async installServer(server: McpServer): Promise<{ success: boolean; error?: string }> {
    this.ensureConfigDirectory();

    try {
      installServerConfig({
        name: server.name,
        command: server.command,
        commandArgs: server.args,
        env: server.env ? resolveEnvironmentVariables(server.env) : undefined,
        tools: []
      });

      // Auto-sync tools for this server
      await this.autoSyncTools(server.name);

      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to install server: ${String(error)}` };
    }
  }

  static async removeServer(serverName: string): Promise<{ success: boolean; error?: string }> {
    this.ensureConfigDirectory();

    try {
      const success = removeServerConfig(serverName);
      if (!success) {
        return { success: false, error: `Server '${serverName}' not found` };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to remove server: ${String(error)}` };
    }
  }

  static async listInstalledServers(): Promise<string[]> {
    try {
      const servers = listMcpServers();
      return servers.map(server => server.name);
    } catch (error) {
      console.error("Failed to load MCP config:", error);
      return [];
    }
  }

  static async listAvailablePresets(): Promise<{ name: string; description: string }[]> {
    const presets = getAllPresets();
    return presets.map(preset => ({
      name: preset.name,
      description: preset.description
    }));
  }

  static async syncTools(serverName: string): Promise<{ success: boolean; tools?: any[]; error?: string }> {
    try {
      console.log(`🔄 Syncing tools for MCP server: ${serverName}`);
      
      // Get tools from the actual MCP server using SDK
      const realTools = await McpClientManager.getServerTools(serverName);
      
      if (realTools.length > 0) {
        // Update server configuration with real tools
        const toolNames = realTools.map(tool => tool.name);
        syncMcpServerTools(serverName, toolNames);
        
        console.log(`✅ Found ${realTools.length} tools from server '${serverName}'`);
        return { success: true, tools: realTools };
      }

      // Fallback: try to get tools from skills
      console.log(`⚠️ No tools from server, trying skills...`);
      const skillTools = await this.getToolsFromSkills(serverName);
      
      if (skillTools.length > 0) {
        syncMcpServerTools(serverName, skillTools.map(tool => tool.name));
        return { success: true, tools: skillTools };
      }

      // Final fallback: mock tools
      console.log(`⚠️ No tools found, using mock tools...`);
      const mockTools = this.getMockTools(serverName);
      syncMcpServerTools(serverName, mockTools.map(tool => tool.name));
      
      return { 
        success: true, 
        tools: mockTools
      };
    } catch (error) {
      console.error(`Failed to sync tools for server '${serverName}':`, error);
      return { success: false, error: `Failed to sync tools: ${String(error)}` };
    }
  }

  private static async getToolsFromSkills(serverName: string): Promise<any[]> {
    try {
      const { SkillLoader } = await import("../skills/skill-loader.js");
      await SkillLoader.loadAllSkills();
      const skills = SkillLoader.getAllSkills();
      
      const tools: any[] = [];
      const toolNames = new Set<string>();
      
      for (const skill of skills) {
        // Check if skill uses this server
        if (skill.mcpServer === serverName || skill.mcpServerConfig?.name === serverName) {
          // Add tools from skill's MCP tools definition
          if (skill.mcpTools) {
            for (const tool of skill.mcpTools) {
              if (!toolNames.has(tool.name)) {
                tools.push(tool);
                toolNames.add(tool.name);
              }
            }
          }
          
          // Extract tools from plan template
          if (skill.planTemplate) {
            for (const step of skill.planTemplate) {
              if (step.action === "MCP_RUN" && step.args?.server === serverName && step.args?.tool) {
                const toolName = step.args.tool;
                if (!toolNames.has(toolName)) {
                  tools.push({
                    name: toolName,
                    description: `Tool used in ${skill.name} skill`
                  });
                  toolNames.add(toolName);
                }
              }
            }
          }
        }
      }
      
      return tools;
    } catch (error) {
      console.warn(`Failed to get tools from skills for server ${serverName}:`, error);
      return [];
    }
  }

  private static getMockTools(serverName: string): any[] {
    const toolMap: Record<string, any[]> = {
      github: [
        { name: "github_search_repositories", description: "Search GitHub repositories" },
        { name: "github_get_repository", description: "Get repository information" },
        { name: "github_create_issue", description: "Create a GitHub issue" },
        { name: "github_list_issues", description: "List repository issues" }
      ],
      "brave-search": [
        { name: "brave_web_search", description: "Search the web using Brave Search" }
      ],
      fetch: [
        { name: "fetch_url", description: "Fetch content from a URL" }
      ],
      puppeteer: [
        { name: "puppeteer_navigate", description: "Navigate to a webpage" },
        { name: "puppeteer_screenshot", description: "Take a screenshot" },
        { name: "puppeteer_extract", description: "Extract text from webpage" }
      ],
      filesystem: [
        { name: "filesystem_read_file", description: "Read file contents" },
        { name: "filesystem_write_file", description: "Write to a file" },
        { name: "filesystem_list_directory", description: "List directory contents" }
      ],
      sqlite: [
        { name: "sqlite_query", description: "Execute SQLite query" },
        { name: "sqlite_create_table", description: "Create SQLite table" }
      ],
      "pdf-reader": [
        { name: "pdf_extract_text", description: "Extract text from PDF" }
      ],
      "sequential-thinking": [
        { name: "sequential_think", description: "Sequential thinking process" }
      ]
    };

    return toolMap[serverName] || [];
  }

  static async getServerInfo(serverName: string): Promise<McpServer | null> {
    try {
      const servers = listMcpServers();
      const server = servers.find(s => s.name === serverName);
      
      if (!server) {
        return null;
      }

      return {
        name: server.name,
        command: server.command,
        args: server.args,
        env: server.env
      };
    } catch (error) {
      console.error("Failed to get server info:", error);
      return null;
    }
  }

  static async validateInstallation(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const servers = listMcpServers();
      
      for (const server of servers) {
        if (!server.command) {
          errors.push(`Server '${server.name}' missing command`);
        }
        
        if (!Array.isArray(server.args)) {
          errors.push(`Server '${server.name}' has invalid args`);
        }
      }
    } catch (error) {
      errors.push(`Failed to load config: ${String(error)}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Auto-sync tools when skills are installed
  private static async autoSyncTools(serverName: string): Promise<void> {
    try {
      await this.syncTools(serverName);
    } catch (error) {
      console.warn(`Failed to auto-sync tools for server ${serverName}:`, error);
    }
  }

  /**
   * Execute a tool on an MCP server using the SDK
   */
  static async executeTool(
    serverName: string, 
    toolName: string, 
    args: any = {}
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const result = await McpClientManager.executeTool(serverName, toolName, args);
      return { success: true, result };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to execute tool '${toolName}' on server '${serverName}': ${String(error)}` 
      };
    }
  }

  /**
   * Get connection status for all MCP servers
   */
  static async getConnectionStatus(): Promise<Record<string, boolean>> {
    const servers = listMcpServers();
    const status: Record<string, boolean> = {};
    
    for (const server of servers) {
      status[server.name] = McpClientManager.isConnected(server.name);
    }
    
    return status;
  }

  /**
   * Disconnect from all MCP servers
   */
  static async disconnectAll(): Promise<void> {
    await McpClientManager.disconnectAll();
  }
}
