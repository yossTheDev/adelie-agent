import fs from "node:fs";
import path from "node:path";
import type { Skill, SkillParseResult, SkillInput, McpServerConfig } from "./skill-types.js";

export class SkillParser {
  private static readonly REQUIRED_SECTIONS = [
    "Description",
    "When to use",
    "Inputs",
    "Plan Template",
    "Example",
    "Expected behavior"
  ];

  private static readonly OPTIONAL_SECTIONS = [
    "MCP Server Config"
  ];

  static parseSkillFile(filePath: string): SkillParseResult {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return this.parseSkillContent(content, path.basename(filePath, ".skill.md"));
    } catch (error) {
      return {
        success: false,
        error: `Failed to read skill file: ${String(error)}`
      };
    }
  }

  static parseSkillContent(content: string, filename?: string): SkillParseResult {
    try {
      const lines = content.split("\n");
      const sections: Record<string, string[]> = {};
      let currentSection = "";
      let skillName = filename;

      // Parse sections
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Extract skill name from header
        if (trimmedLine.startsWith("# Skill:")) {
          skillName = trimmedLine.replace("# Skill:", "").trim();
          continue;
        }

        // Detect section headers
        if (trimmedLine.startsWith("##")) {
          currentSection = trimmedLine.replace("##", "").trim();
          sections[currentSection] = [];
          continue;
        }

        // Add content to current section
        if (currentSection && trimmedLine) {
          sections[currentSection].push(trimmedLine);
        }
      }

      // Validate required sections
      const missingSections = this.REQUIRED_SECTIONS.filter(
        section => !sections[section] || sections[section].length === 0
      );

      if (missingSections.length > 0) {
        return {
          success: false,
          error: `Missing required sections: ${missingSections.join(", ")}`
        };
      }

      // Parse skill data
      const skill: Skill = {
        name: skillName || "unknown",
        description: sections["Description"].join(" "),
        whenToUse: this.parseListItems(sections["When to use"]),
        inputs: this.parseInputs(sections["Inputs"]),
        planTemplate: this.parsePlanTemplate(sections["Plan Template"]),
        example: sections["Example"].join("\n"),
        expectedBehavior: sections["Expected behavior"].join(" "),
        mcpServer: this.extractMcpServer(sections["Plan Template"]),
        mcpServerConfig: sections["MCP Server Config"] ? this.parseMcpServerConfig(sections["MCP Server Config"]) : undefined
      };

      return {
        success: true,
        skill
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse skill content: ${String(error)}`
      };
    }
  }

  private static parseListItems(items: string[]): string[] {
    return items
      .filter(item => item.startsWith("-") || item.startsWith("*"))
      .map(item => item.replace(/^[-*]\s*/, "").trim());
  }

  private static parseInputs(inputLines: string[]): SkillInput[] {
    const inputs: SkillInput[] = [];
    
    for (const line of inputLines) {
      const match = line.match(/^-\s*([^:]+):\s*(.+)$/);
      if (match) {
        inputs.push({
          name: match[1].trim(),
          description: match[2].trim()
        });
      }
    }
    
    return inputs;
  }

  private static parsePlanTemplate(templateLines: string[]): any[] {
    const templateContent = templateLines.join("\n");
    
    // Extract JSON from the template
    const jsonMatch = templateContent.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (error) {
        throw new Error(`Invalid JSON in Plan Template: ${String(error)}`);
      }
    }
    
    // Try parsing the entire content as JSON
    try {
      return JSON.parse(templateContent);
    } catch (error) {
      throw new Error(`Plan Template must contain valid JSON: ${String(error)}`);
    }
  }

  private static extractMcpServer(templateLines: string[]): string | undefined {
    const templateContent = templateLines.join("\n");
    
    // Look for MCP_RUN action to extract server name
    const mcpMatch = templateContent.match(/"server":\s*"([^"]+)"/);
    if (mcpMatch) {
      return mcpMatch[1];
    }
    
    // Also check for common MCP server names in the template
    const commonServers = ['github', 'brave-search', 'fetch', 'puppeteer', 'filesystem', 'sqlite', 'postgres', 'pdf-reader', 'sequential-thinking'];
    for (const server of commonServers) {
      if (templateContent.includes(server)) {
        return server;
      }
    }
    
    return undefined;
  }

  private static parseMcpServerConfig(configLines: string[]): McpServerConfig | undefined {
    const configContent = configLines.join("\n");
    
    // Look for JSON block
    const jsonMatch = configContent.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (error) {
        throw new Error(`Invalid JSON in MCP Server Config: ${String(error)}`);
      }
    }
    
    // Try parsing entire content as JSON
    try {
      return JSON.parse(configContent);
    } catch (error) {
      throw new Error(`MCP Server Config must contain valid JSON: ${String(error)}`);
    }
  }

  static validateSkill(skill: Skill): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!skill.name || skill.name.trim() === "") {
      errors.push("Skill name is required");
    }

    if (!skill.description || skill.description.trim() === "") {
      errors.push("Description is required");
    }

    if (!skill.whenToUse || skill.whenToUse.length === 0) {
      errors.push("At least one 'when to use' condition is required");
    }

    if (!skill.planTemplate || !Array.isArray(skill.planTemplate)) {
      errors.push("Plan Template must be a valid JSON array");
    }

    if (!skill.example || skill.example.trim() === "") {
      errors.push("Example is required");
    }

    if (!skill.expectedBehavior || skill.expectedBehavior.trim() === "") {
      errors.push("Expected behavior is required");
    }

    // Validate plan template structure
    if (skill.planTemplate && Array.isArray(skill.planTemplate)) {
      for (let i = 0; i < skill.planTemplate.length; i++) {
        const step = skill.planTemplate[i];
        if (!step.action || typeof step.action !== "string") {
          errors.push(`Step ${i + 1} in Plan Template must have an 'action' field`);
        }
        
        if (step.action === "MCP_RUN" && (!step.args || !step.args.server)) {
          errors.push(`MCP_RUN step ${i + 1} must specify server in args`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
