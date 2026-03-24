import path from "node:path";
import fs from "node:fs";
import { SkillLoader } from "../skills/skill-loader.js";
import { McpInstaller } from "./mcp-installer.js";

export interface PresetSkillMapping {
  [presetName: string]: string[];
}

export const PRESET_SKILLS: PresetSkillMapping = {
  github: ["github-search"],
  "web-search": ["web-search"],
  docs: ["docs-retrieval"],
  "file-index": ["file-index"],
  database: ["database-query"],
  pdf: ["pdf-analysis"],
  "shell-system": ["shell-commands"],
  complete: ["github-search", "web-search", "docs-retrieval", "file-index", "database-query", "pdf-analysis", "shell-commands"]
};

export async function installPresetSkills(presetName: string): Promise<{ success: boolean; error?: string }> {
  const skillNames = PRESET_SKILLS[presetName];
  if (!skillNames) {
    return { success: false, error: `No skills found for preset: ${presetName}` };
  }

  const skillsDir = path.join(process.cwd(), "skills");
  const presetsDir = path.join(skillsDir, "presets");
  
  for (const skillName of skillNames) {
    // Try to find skill in both locations
    const possiblePaths = [
      path.join(skillsDir, `${skillName}.skill.md`),  // skills/
      path.join(presetsDir, `${skillName}.skill.md`) // skills/presets/
    ];
    
    let skillFile = "";
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        skillFile = possiblePath;
        break;
      }
    }
    
    if (!skillFile) {
      return { success: false, error: `Skill file not found: ${skillName}` };
    }
    
    try {
      const result = await SkillLoader.installSkillFile(skillFile);
      if (!result.success) {
        return { success: false, error: `Failed to install skill ${skillName}: ${result.error}` };
      }
      console.log(`✅ Installed skill: ${skillName}`);
      
      // Auto-sync tools for MCP servers used by this skill
      await autoSyncToolsForSkill(skillFile);
    } catch (error) {
      return { success: false, error: `Error installing skill ${skillName}: ${String(error)}` };
    }
  }

  return { success: true };
}

export function getPresetSkills(presetName: string): string[] {
  return PRESET_SKILLS[presetName] || [];
}

export function getAllPresetSkills(): PresetSkillMapping {
  return { ...PRESET_SKILLS };
}

// Auto-sync tools for MCP servers used by a skill
async function autoSyncToolsForSkill(skillFile: string): Promise<void> {
  try {
    // Read skill file to extract MCP server info
    const content = fs.readFileSync(skillFile, "utf-8");
    
    // Look for MCP Server Config section
    const mcpConfigMatch = content.match(/## MCP Server Config\s*```json\s*([\s\S]*?)\s*```/);
    if (mcpConfigMatch) {
      const mcpConfig = JSON.parse(mcpConfigMatch[1]);
      if (mcpConfig.name) {
        await McpInstaller.syncTools(mcpConfig.name);
        console.log(`🔄 Auto-synced tools for MCP server: ${mcpConfig.name}`);
      }
    }
  } catch (error) {
    console.warn(`Failed to auto-sync tools for skill ${skillFile}:`, error);
  }
}
