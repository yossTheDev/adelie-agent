import type { CommandContext, CommandResult } from '../types/command.js';
import { commandRegistry } from './command-registry.js';

export interface ParseOptions {
  help?: boolean;
  version?: boolean;
  model?: string | null;
  context?: string | null;
  config?: string | null;
  ask?: boolean;
  planner?: boolean;
}

export interface ParsedCommand {
  command?: string;
  args: string[];
  options: ParseOptions;
  query?: string;
  isQuery: boolean;
}

export const parseArguments = (args: string[]): ParsedCommand => {
  const options: ParseOptions = {
    help: false,
    version: false,
    model: null,
    context: null,
    config: null,
    ask: false,
    planner: false,
  };

  const filteredArgs: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--version") {
      options.version = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--ask") {
      options.ask = true;
    } else if (arg === "--planner") {
      options.planner = true;
    } else if (arg === "--model" && i + 1 < args.length) {
      options.model = args[i + 1];
      i++; // Skip next argument
    } else if (arg === "--context" && i + 1 < args.length) {
      options.context = args[i + 1];
      i++; // Skip next argument
    } else if (arg === "--config" && i + 1 < args.length) {
      options.config = args[i + 1];
      i++; // Skip next argument
    } else {
      filteredArgs.push(arg);
    }
  }

  // Check if first argument is a known command
  const command = filteredArgs.length > 0 ? filteredArgs[0] : undefined;
  const isKnownCommand = command ? commandRegistry.get(command) !== undefined : false;
  
  if (isKnownCommand) {
    return {
      command,
      args: filteredArgs.slice(1),
      options,
      isQuery: false
    };
  } else {
    // Treat as query
    const query = filteredArgs.join(" ");
    return {
      args: filteredArgs,
      options,
      query,
      isQuery: true
    };
  }
};

export const executeCommand = async (parsedCommand: ParsedCommand): Promise<CommandResult> => {
  if (!parsedCommand.command) {
    return {
      success: false,
      message: "No command specified"
    };
  }

  const command = commandRegistry.get(parsedCommand.command);
  
  if (!command) {
    return {
      success: false,
      message: `Unknown command: ${parsedCommand.command}`
    };
  }

  // Check for help flag on command
  if (parsedCommand.options.help) {
    commandRegistry.showHelp(parsedCommand.command);
    return { success: true };
  }

  const context: CommandContext = {
    args: parsedCommand.args,
    options: parsedCommand.options
  };

  try {
    return await command.handler(context);
  } catch (error) {
    return {
      success: false,
      message: `Error executing command: ${String(error)}`
    };
  }
};

export const showGeneralHelp = (): void => {
  commandRegistry.showHelp();
};
