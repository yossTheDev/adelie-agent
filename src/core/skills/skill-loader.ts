import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Skill, SkillParseResult } from "./skill-types.js";
import { SkillParser } from "./skill-parser.js";
import { McpInstaller } from "../mcp/mcp-installer.js";

export class SkillLoader {
  private static readonly SKILLS_DIR = path.join(os.homedir(), ".adelie", "skills");
  private static skills: Map<string, Skill> = new Map();

  static ensureSkillsDirectory(): void {
    if (!fs.existsSync(this.SKILLS_DIR)) {
      fs.mkdirSync(this.SKILLS_DIR, { recursive: true });
    }
  }

  static getSkillsDirectory(): string {
    return this.SKILLS_DIR;
  }

  static async loadAllSkills(): Promise<{ skills: Skill[]; errors: string[] }> {
    this.ensureSkillsDirectory();
    
    const skills: Skill[] = [];
    const errors: string[] = [];

    try {
      const files = fs.readdirSync(this.SKILLS_DIR);
      const skillFiles = files.filter(file => file.endsWith(".skill.md"));

      for (const file of skillFiles) {
        const filePath = path.join(this.SKILLS_DIR, file);
        const result = this.loadSkillFile(filePath);
        
        if (result.success && result.skill) {
          skills.push(result.skill);
          this.skills.set(result.skill.name, result.skill);
        } else {
          errors.push(`${file}: ${result.error}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to read skills directory: ${String(error)}`);
    }

    return { skills, errors };
  }

  static loadSkillFile(filePath: string): SkillParseResult {
    const result = SkillParser.parseSkillFile(filePath);
    
    if (result.success && result.skill) {
      const validation = SkillParser.validateSkill(result.skill);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(", ")}`
        };
      }
    }
    
    return result;
  }

  static async installSkillFile(sourcePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = this.loadSkillFile(sourcePath);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      if (!result.skill) {
        return { success: false, error: "No skill data found" };
      }

      this.ensureSkillsDirectory();
      
      const fileName = `${result.skill.name}.skill.md`;
      const destPath = path.join(this.SKILLS_DIR, fileName);

      // Check if skill already exists
      if (fs.existsSync(destPath)) {
        return { success: false, error: `Skill '${result.skill.name}' already exists` };
      }

      // Copy the skill file
      fs.copyFileSync(sourcePath, destPath);
      
      // Install required MCP servers
      const mcpResult = await this.installMcpDependencies(result.skill);
      if (!mcpResult.success) {
        // Clean up the skill file if MCP installation failed
        fs.unlinkSync(destPath);
        return { success: false, error: mcpResult.error };
      }
      
      // Add to cache
      this.skills.set(result.skill.name, result.skill);

      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to install skill: ${String(error)}` };
    }
  }

  static async removeSkill(skillName: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.ensureSkillsDirectory();
      
      const fileName = `${skillName}.skill.md`;
      const filePath = path.join(this.SKILLS_DIR, fileName);

      if (!fs.existsSync(filePath)) {
        return { success: false, error: `Skill '${skillName}' not found` };
      }

      fs.unlinkSync(filePath);
      this.skills.delete(skillName);

      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to remove skill: ${String(error)}` };
    }
  }

  static getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  static getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  static getSkillNames(): string[] {
    return Array.from(this.skills.keys());
  }

  static async checkMcpDependencies(skill: Skill): Promise<{ missing: string[]; available: string[] }> {
    const requiredServers: string[] = [];
    
    if (skill.mcpServer) {
      requiredServers.push(skill.mcpServer);
    }
    
    // Also check template for other MCP server references
    const templateContent = JSON.stringify(skill.planTemplate);
    const commonServers = ['github', 'brave-search', 'fetch', 'puppeteer', 'filesystem', 'sqlite', 'postgres', 'pdf-reader', 'sequential-thinking'];
    
    for (const server of commonServers) {
      if (templateContent.includes(server) && !requiredServers.includes(server)) {
        requiredServers.push(server);
      }
    }
    
    const installedServers = await McpInstaller.listInstalledServers();
    const missing = requiredServers.filter(server => !installedServers.includes(server));
    const available = requiredServers.filter(server => installedServers.includes(server));
    
    return { missing, available };
  }

  static async installMcpDependencies(skill: Skill): Promise<{ success: boolean; error?: string }> {
    const { missing } = await this.checkMcpDependencies(skill);
    
    if (missing.length === 0) {
      return { success: true };
    }
    
    for (const server of missing) {
      console.log(`Installing required MCP server: ${server}`);
      const result = await McpInstaller.installPreset(server);
      if (!result.success) {
        return { success: false, error: `Failed to install MCP server '${server}': ${result.error}` };
      }
      console.log(`✓ MCP server '${server}' installed successfully`);
    }
    
    return { success: true };
  }

  static async validateAllSkills(): Promise<{ valid: boolean; errors: string[] }> {
    const { skills, errors } = await this.loadAllSkills();
    const validationErrors: string[] = [];

    for (const skill of skills) {
      const validation = SkillParser.validateSkill(skill);
      if (!validation.valid) {
        validationErrors.push(`${skill.name}: ${validation.errors.join(", ")}`);
      }
    }

    return {
      valid: validationErrors.length === 0 && errors.length === 0,
      errors: [...errors, ...validationErrors]
    };
  }

  static clearCache(): void {
    this.skills.clear();
  }

  static getSkillsForPlanner(): string {
    const skills = this.getAllSkills();
    
    if (skills.length === 0) {
      return "No skills available.";
    }

    let output = "Available Skills:\n\n";
    
    for (const skill of skills) {
      output += `## ${skill.name}\n`;
      output += `Description: ${skill.description}\n`;
      output += `When to use:\n`;
      for (const condition of skill.whenToUse) {
        output += `- ${condition}\n`;
      }
      output += `Inputs: ${skill.inputs.map(inp => `${inp.name} (${inp.description})`).join(", ")}\n`;
      output += `MCP Server: ${skill.mcpServer || "None"}\n\n`;
    }

    return output;
  }

  static expandSkillTemplate(skillName: string, inputs: Record<string, any>): any[] | null {
    const skill = this.getSkill(skillName);
    if (!skill) {
      return null;
    }

    // Validate inputs
    const missingInputs = skill.inputs.filter(inp => !(inp.name in inputs));
    if (missingInputs.length > 0) {
      throw new Error(`Missing required inputs for skill '${skillName}': ${missingInputs.map(inp => inp.name).join(", ")}`);
    }

    // Create a copy of the template
    const template = JSON.parse(JSON.stringify(skill.planTemplate));
    
    // Check if skill has MCP server configuration
    if (skill.mcpServerConfig) {
      // Use skill's own MCP server configuration
      console.log(`Using skill's built-in MCP server configuration for: ${skill.mcpServerConfig.name}`);
      // Override any MCP server references in template with the skill's configuration
      const resolveWithMcpConfig = (obj: any): any => {
        if (typeof obj === "string") {
          return obj.replace(/\$\$input\.(\w+)/g, (match, varName) => {
            if (varName in inputs) {
              return String(inputs[varName]);
            }
            throw new Error(`Undefined input variable: $input.${varName}`);
          });
        }
        
        if (Array.isArray(obj)) {
          return obj.map(resolveWithMcpConfig);
        }
        
        if (obj && typeof obj === "object") {
          const resolved: any = {};
          for (const [key, value] of Object.entries(obj)) {
            // For MCP_RUN actions, use the skill's MCP server config
            if (key === "server" && typeof value === "string") {
              if (skill.mcpServerConfig && value === skill.mcpServerConfig.name) {
                // Replace with the configured server name
                resolved[key] = skill.mcpServerConfig.name;
              } else {
                resolved[key] = resolveWithMcpConfig(value);
              }
            } else {
              resolved[key] = resolveWithMcpConfig(value);
            }
          }
          return resolved;
        }
        
        return obj;
      };
      
      return resolveWithMcpConfig(template);
    }
    
    // Replace input variables in template
    const resolveVariables = (obj: any): any => {
      if (typeof obj === "string") {
        return obj.replace(/\$\$input\.(\w+)/g, (match, varName) => {
          if (varName in inputs) {
            return String(inputs[varName]);
          }
          throw new Error(`Undefined input variable: $input.${varName}`);
        });
      }
      
      if (Array.isArray(obj)) {
        return obj.map(resolveVariables);
      }
      
      if (obj && typeof obj === "object") {
        const resolved: any = {};
        for (const [key, value] of Object.entries(obj)) {
          resolved[key] = resolveVariables(value);
        }
        return resolved;
      }
      
      return obj;
    };
    
    return resolveVariables(template);
  }
}
