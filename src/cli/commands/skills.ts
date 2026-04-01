import ora from "ora";
import type { Command, CommandContext, CommandResult } from '../types/command.js';

const handleSkillsList = async (): Promise<CommandResult> => {
  try {
    const { SkillLoader } = await import("../../core/skills/skill-loader.js");
    await SkillLoader.loadAllSkills();
    const skills = SkillLoader.getAllSkills();

    console.log("Available skills:");
    if (skills.length === 0) {
      console.log("  No skills installed.");
      console.log("  Install skills with: adelie skills install <file.skill.md>");
    } else {
      for (const skill of skills) {
        console.log(
          `- ${skill.name}: ${skill.description}`,
        );
        console.log(`  When to use: ${skill.whenToUse.join(", ")}`);
        if (skill.mcpServer) {
          console.log(`  Requires MCP: ${skill.mcpServer}`);
        }
        console.log("");
      }
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error listing skills: ${String(error)}`
    };
  }
};

const handleSkillsInstall = async (args: string[]): Promise<CommandResult> => {
  const [filePath] = args;
  
  if (!filePath) {
    return {
      success: false,
      message: "Usage: adelie skills install <file.skill.md|url>\nExamples:\n  adelie skills install ./my-skill.skill.md\n  adelie skills install https://raw.githubusercontent.com/user/repo/main/skill.skill.md"
    };
  }

  const spinner = ora("Installing skill...").start();
  try {
    const { SkillLoader } = await import("../../core/skills/skill-loader.js");
    const result = await SkillLoader.installSkillFile(filePath);
    if (result.success) {
      spinner.succeed("Skill installed successfully.");
      return { success: true };
    } else {
      spinner.fail(`Installation failed: ${result.error}`);
      return {
        success: false,
        message: `Installation failed: ${result.error}`
      };
    }
  } catch (error) {
    spinner.fail(`Installation failed: ${String(error)}`);
    return {
      success: false,
      message: `Installation failed: ${String(error)}`
    };
  }
};

const handleSkillsRemove = async (args: string[]): Promise<CommandResult> => {
  const [skillName] = args;
  
  if (!skillName) {
    return {
      success: false,
      message: "Usage: adelie skills remove <skill-name>"
    };
  }

  const spinner = ora("Removing skill...").start();
  try {
    const { SkillLoader } = await import("../../core/skills/skill-loader.js");
    const result = await SkillLoader.removeSkill(skillName);
    if (result.success) {
      spinner.succeed(`Skill '${skillName}' removed successfully.`);
      return { success: true };
    } else {
      spinner.fail(`Removal failed: ${result.error}`);
      return {
        success: false,
        message: `Removal failed: ${result.error}`
      };
    }
  } catch (error) {
    spinner.fail(`Removal failed: ${String(error)}`);
    return {
      success: false,
      message: `Removal failed: ${String(error)}`
    };
  }
};

const handleSkillsValidate = async (): Promise<CommandResult> => {
  const spinner = ora("Validating skills...").start();
  try {
    const { SkillLoader } = await import("../../core/skills/skill-loader.js");
    const result = await SkillLoader.validateAllSkills();
    if (result.valid) {
      spinner.succeed("All skills are valid.");
      return { success: true };
    } else {
      spinner.fail("Validation errors found:");
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
      return {
        success: false,
        message: "Validation errors found"
      };
    }
  } catch (error) {
    spinner.fail(`Validation failed: ${String(error)}`);
    return {
      success: false,
      message: `Validation failed: ${String(error)}`
    };
  }
};

export const skillsCommand: Command = {
  name: 'skills',
  description: 'Manage skills and capabilities',
  usage: 'adelie skills [subcommand] [options]',
  examples: [
    'adelie skills list',
    'adelie skills install ./my-skill.skill.md',
    'adelie skills remove my-skill',
    'adelie skills validate'
  ],
  subcommands: {
    list: {
      name: 'list',
      description: 'List installed skills',
      usage: 'adelie skills list',
      examples: ['adelie skills list'],
      handler: () => handleSkillsList()
    },
    install: {
      name: 'install',
      description: 'Install a skill from file or URL',
      usage: 'adelie skills install <file.skill.md|url>',
      examples: [
        'adelie skills install ./my-skill.skill.md',
        'adelie skills install https://example.com/skill.skill.md'
      ],
      handler: (context: CommandContext) => handleSkillsInstall(context.args)
    },
    remove: {
      name: 'remove',
      description: 'Remove an installed skill',
      usage: 'adelie skills remove <skill-name>',
      examples: ['adelie skills remove my-skill'],
      handler: (context: CommandContext) => handleSkillsRemove(context.args)
    },
    validate: {
      name: 'validate',
      description: 'Validate all installed skills',
      usage: 'adelie skills validate',
      examples: ['adelie skills validate'],
      handler: () => handleSkillsValidate()
    }
  },
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const [subcommand, ...rest] = context.args;
    
    if (!subcommand || subcommand === "list") {
      return await handleSkillsList();
    }
    
    if (subcommand === "install") {
      return await handleSkillsInstall(rest);
    }
    
    if (subcommand === "remove") {
      return await handleSkillsRemove(rest);
    }
    
    if (subcommand === "validate") {
      return await handleSkillsValidate();
    }
    
    return {
      success: false,
      message: "Unknown skills command. Available commands: list, install, remove, validate"
    };
  }
};
