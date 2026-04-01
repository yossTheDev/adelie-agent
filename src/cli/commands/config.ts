import type { Command, CommandContext, CommandResult } from '../types/command.js';
import {
  getAgentConfigPaths,
  readAgentConfig,
  resetAgentConfig,
  writeAgentConfig,
} from "../../core/config/agent-config.js";

const handleConfigShow = (): CommandResult => {
  const cfg = readAgentConfig();
  const paths = getAgentConfigPaths();
  
  console.log("Current config:");
  console.log(JSON.stringify(cfg, null, 2));
  console.log(`Path: ${paths.configPath}`);
  
  return { success: true };
};

const handleConfigPath = (): CommandResult => {
  const paths = getAgentConfigPaths();
  console.log(paths.configPath);
  return { success: true };
};

const handleConfigReset = (): CommandResult => {
  const cfg = resetAgentConfig();
  console.log("Config reset to defaults.");
  console.log(JSON.stringify(cfg, null, 2));
  return { success: true };
};

const handleConfigSet = (args: string[]): CommandResult => {
  const [key, ...valueParts] = args;
  const valueRaw = valueParts.join(" ").trim();
  
  if (!key || !valueRaw) {
    return {
      success: false,
      message: "Usage: adelie config set <model|ollama_url|debug|max_loop_iterations|language> <value>"
    };
  }

  let value: string | boolean | number = valueRaw;
  if (key === "debug") value = valueRaw.toLowerCase() === "true";
  if (key === "max_loop_iterations") value = Number(valueRaw);

  const next = writeAgentConfig({ [key]: value } as any);
  console.log(`Updated '${key}'.`);
  console.log(JSON.stringify(next, null, 2));
  
  return { success: true };
};

export const configCommand: Command = {
  name: 'config',
  description: 'Manage configuration settings',
  usage: 'adelie config [subcommand] [options]',
  examples: [
    'adelie config show',
    'adelie config set model qwen2.5-coder',
    'adelie config set debug true',
    'adelie config reset',
    'adelie config path'
  ],
  subcommands: {
    show: {
      name: 'show',
      description: 'Show current configuration',
      usage: 'adelie config show',
      examples: ['adelie config show'],
      handler: () => handleConfigShow()
    },
    path: {
      name: 'path',
      description: 'Show configuration file path',
      usage: 'adelie config path',
      examples: ['adelie config path'],
      handler: () => handleConfigPath()
    },
    reset: {
      name: 'reset',
      description: 'Reset configuration to defaults',
      usage: 'adelie config reset',
      examples: ['adelie config reset'],
      handler: () => handleConfigReset()
    },
    set: {
      name: 'set',
      description: 'Set a configuration value',
      usage: 'adelie config set <key> <value>',
      examples: [
        'adelie config set model qwen2.5-coder',
        'adelie config set debug true'
      ],
      handler: (context: CommandContext) => handleConfigSet(context.args)
    }
  },
  handler: (context: CommandContext): CommandResult => {
    const [subcommand, ...rest] = context.args;
    
    if (!subcommand || subcommand === "show") {
      return handleConfigShow();
    }
    
    if (subcommand === "path") {
      return handleConfigPath();
    }
    
    if (subcommand === "reset") {
      return handleConfigReset();
    }
    
    if (subcommand === "set") {
      return handleConfigSet(rest);
    }
    
    return {
      success: false,
      message: "Unknown config command. Use 'adelie config --help' for available commands."
    };
  }
};
