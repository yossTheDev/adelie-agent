import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { McpServer, McpPreset } from "../skills/skill-types.js";
import { MCP_PRESETS, getPreset, getAllPresets, resolveEnvironmentVariables } from "./mcp-presets.js";
import { installPresetSkills } from "./preset-skills.js";

const execAsync = promisify(exec);

export class McpInstaller {
  private static readonly CONFIG_DIR = path.join(os.homedir(), ".yi-agent");
  private static readonly CONFIG_FILE = path.join(this.CONFIG_DIR, "mcp-config.json");
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
      // Load existing config
      const existingConfig = await this.loadMcpConfig();
      
      // Add or update servers from preset
      for (const server of preset.servers) {
        existingConfig.mcpServers[server.name] = {
          command: server.command,
          args: server.args,
          env: server.env ? resolveEnvironmentVariables(server.env) : undefined
        };
      }

      // Save updated config
      await this.saveMcpConfig(existingConfig);

      // Install associated skills
      const skillsResult = await installPresetSkills(presetName);
      if (!skillsResult.success) {
        console.warn(`Warning: Failed to install skills for preset ${presetName}: ${skillsResult.error}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to install preset: ${String(error)}` };
    }
  }

  static async installServer(server: McpServer): Promise<{ success: boolean; error?: string }> {
    this.ensureConfigDirectory();

    try {
      const existingConfig = await this.loadMcpConfig();
      
      existingConfig.mcpServers[server.name] = {
        command: server.command,
        args: server.args,
        env: server.env ? resolveEnvironmentVariables(server.env) : undefined
      };

      await this.saveMcpConfig(existingConfig);

      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to install server: ${String(error)}` };
    }
  }

  static async removeServer(serverName: string): Promise<{ success: boolean; error?: string }> {
    this.ensureConfigDirectory();

    try {
      const existingConfig = await this.loadMcpConfig();
      
      if (existingConfig.mcpServers[serverName]) {
        delete existingConfig.mcpServers[serverName];
        await this.saveMcpConfig(existingConfig);
        return { success: true };
      } else {
        return { success: false, error: `Server '${serverName}' not found` };
      }
    } catch (error) {
      return { success: false, error: `Failed to remove server: ${String(error)}` };
    }
  }

  static async listInstalledServers(): Promise<string[]> {
    try {
      const config = await this.loadMcpConfig();
      return Object.keys(config.mcpServers);
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
      const config = await this.loadMcpConfig();
      const server = config.mcpServers[serverName];
      
      if (!server) {
        return { success: false, error: `Server '${serverName}' not found in config` };
      }

      // Try to run the MCP server to get available tools
      const command = `${server.command} ${server.args.join(" ")}`;
      
      // This is a simplified approach - in a real implementation, you'd need to
      // properly communicate with the MCP server protocol
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 10000,
        env: { ...process.env, ...server.env }
      });

      // For now, return a placeholder response
      return { 
        success: true, 
        tools: [{ name: "placeholder", description: "Tool sync not fully implemented" }]
      };
    } catch (error) {
      return { success: false, error: `Failed to sync tools: ${String(error)}` };
    }
  }

  private static async loadMcpConfig(): Promise<{ mcpServers: Record<string, any> }> {
    if (fs.existsSync(this.CONFIG_FILE)) {
      const content = fs.readFileSync(this.CONFIG_FILE, "utf-8");
      return JSON.parse(content);
    }
    
    return { mcpServers: {} };
  }

  private static async saveMcpConfig(config: { mcpServers: Record<string, any> }): Promise<void> {
    fs.writeFileSync(this.CONFIG_FILE, JSON.stringify(config, null, 2));
    
    // Also update Claude Desktop config if it exists
    await this.updateClaudeConfig(config);
  }

  private static async updateClaudeConfig(config: { mcpServers: Record<string, any> }): Promise<void> {
    try {
      let claudeConfig: any = { mcpServers: {} };
      
      if (fs.existsSync(this.CLAUDE_CONFIG_FILE)) {
        const content = fs.readFileSync(this.CLAUDE_CONFIG_FILE, "utf-8");
        claudeConfig = JSON.parse(content);
      }

      // Merge our config with Claude's config
      claudeConfig.mcpServers = { ...claudeConfig.mcpServers, ...config.mcpServers };

      fs.writeFileSync(this.CLAUDE_CONFIG_FILE, JSON.stringify(claudeConfig, null, 2));
    } catch (error) {
      console.warn("Failed to update Claude Desktop config:", error);
    }
  }

  static async getServerInfo(serverName: string): Promise<McpServer | null> {
    try {
      const config = await this.loadMcpConfig();
      const serverConfig = config.mcpServers[serverName];
      
      if (!serverConfig) {
        return null;
      }

      return {
        name: serverName,
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env
      };
    } catch (error) {
      console.error("Failed to get server info:", error);
      return null;
    }
  }

  static async validateInstallation(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const config = await this.loadMcpConfig();
      
      for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
        if (!serverConfig.command) {
          errors.push(`Server '${serverName}' missing command`);
        }
        
        if (!Array.isArray(serverConfig.args)) {
          errors.push(`Server '${serverName}' has invalid args`);
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
}
