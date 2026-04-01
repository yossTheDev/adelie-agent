import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { readAgentConfig } from "../config/agent-config.js";

export interface ConversationEntry {
  timestamp: number;
  user_input: string;
  agent_response: string;
  mode: "ask" | "planner";
  execution_summary?: any;
}

/**
 * Conversation memory system for maintaining chat history
 */
export class ConversationMemory {
  private filePath: string;
  private entries: ConversationEntry[] = [];
  private loaded = false;
  private maxLength: number;

  constructor(storageDir?: string) {
    const configDir = storageDir || path.join(os.homedir(), ".adelie");
    this.filePath = path.join(configDir, "conversation.json");
    this.maxLength = readAgentConfig().conversation_memory_length;
  }

  /**
   * Load conversation data from disk
   */
  private async load(): Promise<void> {
    if (this.loaded) return;

    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const content = await fs.readFile(this.filePath, "utf-8");
      const data = JSON.parse(content);
      this.entries = Array.isArray(data) ? data : [];
    } catch (error) {
      // File doesn't exist or is invalid, start with empty history
      this.entries = [];
    }
    this.loaded = true;
  }

  /**
   * Save conversation data to disk
   */
  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.entries, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save conversation memory: ${String(error)}`);
    }
  }

  /**
   * Add a new conversation entry
   */
  async addEntry(entry: Omit<ConversationEntry, "timestamp">): Promise<void> {
    await this.load();

    const newEntry: ConversationEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    this.entries.push(newEntry);

    // Keep only the last N entries
    if (this.entries.length > this.maxLength) {
      this.entries = this.entries.slice(-this.maxLength);
    }

    await this.save();
  }

  /**
   * Get the last N conversation entries
   */
  async getRecentEntries(count?: number): Promise<ConversationEntry[]> {
    await this.load();

    const limit = count || this.maxLength;
    return this.entries.slice(-limit);
  }

  /**
   * Get conversation history formatted for LLM context
   */
  async getFormattedHistory(count?: number): Promise<string> {
    const entries = await this.getRecentEntries(count);

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
  async clear(): Promise<void> {
    await this.load();
    this.entries = [];
    await this.save();
  }

  /**
   * Get conversation statistics
   */
  async getStats(): Promise<{ totalEntries: number; totalSize: number; lastUpdated: number }> {
    await this.load();

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

// Global conversation memory instance
let globalConversationMemory: ConversationMemory | null = null;

/**
 * Get or create the global conversation memory instance
 */
export const getConversationMemory = (storageDir?: string): ConversationMemory => {
  if (!globalConversationMemory) {
    globalConversationMemory = new ConversationMemory(storageDir);
  }
  return globalConversationMemory;
};
