import type { Command, CommandContext, CommandResult } from '../types/command.js';
import { getMemoryStore } from "../../core/memory/memory-store.js";

const handleMemoryList = async (): Promise<CommandResult> => {
  try {
    const memoryStore = getMemoryStore();
    const list = await memoryStore.list();
    
    console.log("Memory keys:");
    if (list.length === 0) {
      console.log("  No memory entries found.");
    } else {
      for (const entry of list) {
        console.log(`- ${entry.key}`);
        console.log(`  Created: ${new Date(entry.timestamp).toLocaleString()}`);
        if (entry.source) {
          console.log(`  Source: ${entry.source}`);
        }
        console.log("");
      }
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error listing memory: ${String(error)}`
    };
  }
};

const handleMemorySet = async (args: string[]): Promise<CommandResult> => {
  const [key, ...restArgs] = args;
  
  if (!key || restArgs.length === 0) {
    return {
      success: false,
      message: "Usage: adelie memory set <key> <value> [--instruction \"AI instruction\"]\nNote: Use quotes around values with spaces\nExample: adelie memory set user_profile \"Alice is a developer\" --instruction \"Extract user information as JSON\""
    };
  }

  // Parse instruction flag
  let value = "";
  let instruction = "";
  let instructionFound = false;

  for (let i = 0; i < restArgs.length; i++) {
    if (restArgs[i] === "--instruction" && i + 1 < restArgs.length) {
      instruction = restArgs[i + 1];
      instructionFound = true;
      i++; // Skip the next argument as it's the instruction value
    } else if (!instructionFound) {
      value += (value ? " " : "") + restArgs[i];
    }
  }

  try {
    // Try to parse as JSON first
    let parsedValue;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }

    // Use the memory action instead of direct store to support AI processing
    const { memorySet } = await import("../../core/actions/memory/memory.js");
    const [success, result] = await memorySet({
      key,
      value: parsedValue,
      source: "cli",
      instruction: instruction || undefined
    });

    if (success) {
      console.log(`Set memory key '${key}'${instruction ? " with AI processing" : ""}`);
      return { success: true };
    } else {
      return {
        success: false,
        message: `Error setting memory: ${result}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error setting memory: ${String(error)}`
    };
  }
};

const handleMemoryDelete = async (args: string[]): Promise<CommandResult> => {
  const [key] = args;
  
  if (!key) {
    return {
      success: false,
      message: "Usage: adelie memory delete <key>"
    };
  }

  try {
    const memoryStore = getMemoryStore();
    await memoryStore.delete(key);
    console.log(`Deleted memory key '${key}'`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error deleting memory: ${String(error)}`
    };
  }
};

const handleMemoryClear = async (): Promise<CommandResult> => {
  try {
    const memoryStore = getMemoryStore();
    await memoryStore.clear();
    console.log("Cleared all memory");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error clearing memory: ${String(error)}`
    };
  }
};

const handleMemorySearch = async (args: string[]): Promise<CommandResult> => {
  const [query] = args;
  
  if (!query) {
    return {
      success: false,
      message: "Usage: adelie memory search <query>"
    };
  }

  try {
    const memoryStore = getMemoryStore();
    const results = await memoryStore.search(query);
    console.log(`Search results for '${query}':`);
    
    if (results.length === 0) {
      console.log("  No matching entries found.");
    } else {
      for (const result of results) {
        console.log(`- ${result.key}`);
        console.log(`  Value: ${JSON.stringify(result.value)}`);
        console.log(`  Created: ${new Date(result.timestamp).toLocaleString()}`);
        if (result.source) {
          console.log(`  Source: ${result.source}`);
        }
        console.log("");
      }
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error searching memory: ${String(error)}`
    };
  }
};

const handleMemoryStats = async (): Promise<CommandResult> => {
  try {
    const memoryStore = getMemoryStore();
    const stats = await memoryStore.stats();
    console.log("Memory statistics:");
    console.log(`Total keys: ${stats.totalKeys}`);
    console.log(`Total size: ${stats.totalSize}`);
    console.log(`Last updated: ${stats.lastUpdated}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error getting memory stats: ${String(error)}`
    };
  }
};

export const memoryCommand: Command = {
  name: 'memory',
  description: 'Manage memory storage and retrieval',
  usage: 'adelie memory [subcommand] [options]',
  examples: [
    'adelie memory list',
    'adelie memory set user_name "John Doe"',
    'adelie memory search user',
    'adelie memory delete user_name',
    'adelie memory stats'
  ],
  subcommands: {
    list: {
      name: 'list',
      description: 'List all memory entries',
      usage: 'adelie memory list',
      examples: ['adelie memory list'],
      handler: () => handleMemoryList()
    },
    set: {
      name: 'set',
      description: 'Set a memory value',
      usage: 'adelie memory set <key> <value> [--instruction "AI instruction"]',
      examples: [
        'adelie memory set user_name "John Doe"',
        'adelie memory set user_profile "Alice is a developer" --instruction "Extract user information as JSON"'
      ],
      handler: (context: CommandContext) => handleMemorySet(context.args)
    },
    delete: {
      name: 'delete',
      description: 'Delete a memory entry',
      usage: 'adelie memory delete <key>',
      examples: ['adelie memory delete user_name'],
      handler: (context: CommandContext) => handleMemoryDelete(context.args)
    },
    clear: {
      name: 'clear',
      description: 'Clear all memory entries',
      usage: 'adelie memory clear',
      examples: ['adelie memory clear'],
      handler: () => handleMemoryClear()
    },
    search: {
      name: 'search',
      description: 'Search memory entries',
      usage: 'adelie memory search <query>',
      examples: ['adelie memory search user'],
      handler: (context: CommandContext) => handleMemorySearch(context.args)
    },
    stats: {
      name: 'stats',
      description: 'Show memory statistics',
      usage: 'adelie memory stats',
      examples: ['adelie memory stats'],
      handler: () => handleMemoryStats()
    }
  },
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const [subcommand, ...rest] = context.args;
    
    if (!subcommand || subcommand === "list") {
      return await handleMemoryList();
    }
    
    if (subcommand === "set") {
      return await handleMemorySet(rest);
    }
    
    if (subcommand === "delete") {
      return await handleMemoryDelete(rest);
    }
    
    if (subcommand === "clear") {
      return await handleMemoryClear();
    }
    
    if (subcommand === "search") {
      return await handleMemorySearch(rest);
    }
    
    if (subcommand === "stats") {
      return await handleMemoryStats();
    }
    
    return {
      success: false,
      message: "Unknown memory command. Available commands: list, set, delete, clear, search, stats\nNote: Memory is automatically loaded and used in responses - no 'get' command needed"
    };
  }
};
