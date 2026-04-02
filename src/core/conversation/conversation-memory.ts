import { readAgentConfig } from "../config/agent-config.js";

export interface ConversationEntry {
  timestamp: number;
  user_input: string;
  agent_response: string;
  mode: "ask" | "planner";
  execution_summary?: any;
}

/**
 * Temporary conversation memory system for interactive sessions
 * This memory is lost when the session ends
 */
export class ConversationMemory {
  private entries: ConversationEntry[] = [];
  private maxLength: number;

  constructor() {
    this.maxLength = readAgentConfig().conversation_memory_length;
  }

  /**
   * Add a new conversation entry
   */
  addEntry(entry: Omit<ConversationEntry, "timestamp">): void {
    const newEntry: ConversationEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    this.entries.push(newEntry);

    // Keep only the last N entries
    if (this.entries.length > this.maxLength) {
      this.entries = this.entries.slice(-this.maxLength);
    }
  }

  /**
   * Get the last N conversation entries
   */
  getRecentEntries(count?: number): ConversationEntry[] {
    const limit = count || this.maxLength;
    return this.entries.slice(-limit);
  }

  /**
   * Get conversation history formatted for LLM context
   */
  getFormattedHistory(count?: number): string {
    const entries = this.getRecentEntries(count);

    if (entries.length === 0) {
      return "";
    }

    const formattedEntries = entries.map((entry, index) => {
      const date = new Date(entry.timestamp).toLocaleString();
      const responsePreview = entry.agent_response.length > 300
        ? entry.agent_response.substring(0, 300) + "..."
        : entry.agent_response;

      let entryText = `[Exchange ${index + 1}] ${date} (${entry.mode} mode)\n`;
      entryText += `User: ${entry.user_input}\n`;
      entryText += `Agent: ${responsePreview}\n`;

      if (entry.mode === "planner" && entry.execution_summary) {
        entryText += `Note: ${entry.execution_summary.total_steps || 0} steps executed, `;
        entryText += `result: ${entry.execution_summary.status || "Unknown"}\n`;
      }

      return entryText;
    });

    return `Recent Conversation Context (last ${entries.length} exchanges):\n${formattedEntries.join("\n---\n")}\n`;
  }

  /**
   * Clear all conversation history
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get conversation statistics
   */
  getStats(): { totalEntries: number; totalSize: number; lastUpdated: number } {
    const totalSize = JSON.stringify(this.entries).length;
    const lastUpdated = this.entries.length > 0
      ? Math.max(...this.entries.map(e => e.timestamp))
      : 0;

    return {
      totalEntries: this.entries.length,
      totalSize,
      lastUpdated
    };
  }

  /**
   * Update max length from config
   */
  updateMaxLength(): void {
    this.maxLength = readAgentConfig().conversation_memory_length;
  }
}

// Global conversation memory instance (temporary - lost on session end)
let globalConversationMemory: ConversationMemory | null = null;

/**
 * Get or create the global conversation memory instance
 */
export const getConversationMemory = (): ConversationMemory => {
  if (!globalConversationMemory) {
    globalConversationMemory = new ConversationMemory();
  }
  return globalConversationMemory;
};

/**
 * Clear conversation memory (useful for testing or session reset)
 */
export const clearConversationMemory = (): void => {
  globalConversationMemory = null;
};
