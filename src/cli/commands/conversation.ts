import type { Command, CommandContext, CommandResult } from '../types/command.js';
import { getConversationMemory } from "../../core/conversation/conversation-memory.js";

const handleConversationList = async (): Promise<CommandResult> => {
  try {
    const conversationMemory = getConversationMemory();
    const entries = await conversationMemory.getRecentEntries();
    
    console.log("Recent conversation history:");
    if (entries.length === 0) {
      console.log("  No conversation history found.");
    } else {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const date = new Date(entry.timestamp).toLocaleString();
        console.log(`\n[${i + 1}] ${date} (${entry.mode})`);
        console.log(`User: ${entry.user_input}`);
        const responsePreview = entry.agent_response.length > 100
          ? entry.agent_response.substring(0, 100) + "..."
          : entry.agent_response;
        console.log(`Agent: ${responsePreview}`);
      }
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error listing conversation: ${String(error)}`
    };
  }
};

const handleConversationClear = async (): Promise<CommandResult> => {
  try {
    const conversationMemory = getConversationMemory();
    await conversationMemory.clear();
    console.log("Cleared all conversation history");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error clearing conversation: ${String(error)}`
    };
  }
};

const handleConversationStats = async (): Promise<CommandResult> => {
  try {
    const conversationMemory = getConversationMemory();
    const stats = await conversationMemory.getStats();
    
    console.log("Conversation statistics:");
    console.log(`Total entries: ${stats.totalEntries}`);
    console.log(`Total size: ${stats.totalSize} bytes`);
    console.log(`Last updated: ${stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : "Never"}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error getting conversation stats: ${String(error)}`
    };
  }
};

export const conversationCommand: Command = {
  name: 'conversation',
  description: 'Manage conversation history',
  usage: 'adelie conversation [subcommand] [options]',
  examples: [
    'adelie conversation list',
    'adelie conversation clear',
    'adelie conversation stats'
  ],
  subcommands: {
    list: {
      name: 'list',
      description: 'List recent conversation history',
      usage: 'adelie conversation list',
      examples: ['adelie conversation list'],
      handler: () => handleConversationList()
    },
    clear: {
      name: 'clear',
      description: 'Clear all conversation history',
      usage: 'adelie conversation clear',
      examples: ['adelie conversation clear'],
      handler: () => handleConversationClear()
    },
    stats: {
      name: 'stats',
      description: 'Show conversation statistics',
      usage: 'adelie conversation stats',
      examples: ['adelie conversation stats'],
      handler: () => handleConversationStats()
    }
  },
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const [subcommand, ...rest] = context.args;
    
    if (!subcommand || subcommand === "list") {
      return await handleConversationList();
    }
    
    if (subcommand === "clear") {
      return await handleConversationClear();
    }
    
    if (subcommand === "stats") {
      return await handleConversationStats();
    }
    
    return {
      success: false,
      message: "Unknown conversation command. Available commands: list, clear, stats"
    };
  }
};
