import path from "node:path";
import { SkillLoader } from "../skills/skill-loader.js";

export interface PresetSkillMapping {
  [presetName: string]: string[];
}

export const PRESET_SKILLS: PresetSkillMapping = {
  github: ["github"],
  "web-search": ["web-search"],
  docs: ["docs-retrieval"],
  "file-index": ["file-index"],
  database: ["database-query"],
  pdf: ["pdf-analysis"],
  "shell-system": ["shell-commands"],
  complete: ["github", "web-search", "docs-retrieval", "file-index", "database-query", "pdf-analysis", "shell-commands"]
};

export async function installPresetSkills(presetName: string): Promise<{ success: boolean; error?: string }> {
  const skillNames = PRESET_SKILLS[presetName];
  if (!skillNames) {
    return { success: false, error: `No skills found for preset: ${presetName}` };
  }

  const skillsDir = path.join(process.cwd(), "skills", "presets");
  
  for (const skillName of skillNames) {
    const skillFile = path.join(skillsDir, `${skillName}.skill.md`);
    
    try {
      const result = await SkillLoader.installSkillFile(skillFile);
      if (!result.success) {
        return { success: false, error: `Failed to install skill ${skillName}: ${result.error}` };
      }
      console.log(`✅ Installed skill: ${skillName}`);
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
