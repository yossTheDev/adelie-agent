import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

interface MemoryEntry {
  value: any;
  timestamp: number;
  source?: string;
  instruction?: string; 
}

interface MemoryData {
  [key: string]: MemoryEntry;
}

/**
 * Persistent memory storage system using JSON file
 */
export class MemoryStore {
  private filePath: string;
  private data: MemoryData = {};
  private loaded = false;

  constructor(storageDir?: string) {
    const configDir = storageDir || path.join(os.homedir(), ".adelie");
    this.filePath = path.join(configDir, "memory.json");
  }

  /**
   * Load memory data from disk
   */
  private async load(): Promise<void> {
    if (this.loaded) return;

    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const content = await fs.readFile(this.filePath, "utf-8");
      this.data = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty memory
      this.data = {};
    }
    this.loaded = true;
  }

  /**
   * Save memory data to disk
   */
  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (error) {
      throw new Error(`Failed to save memory: ${String(error)}`);
    }
  }

  /**
   * Store a value with optional metadata and AI instruction
   */
  async set(key: string, value: any, source?: string, instruction?: string): Promise<void> {
    // Load data first to ensure we have latest state
    await this.load();
    
    // Validate key
    if (!key || typeof key !== "string") {
      throw new Error("Memory key must be a non-empty string");
    }

    // Validate value is JSON-serializable
    try {
      JSON.stringify(value);
    } catch {
      throw new Error("Memory value must be JSON-serializable");
    }

    this.data[key] = {
      value,
      timestamp: Date.now(),
      source,
      instruction
    };
    
    // Reset loaded flag to force reload on next get
    this.loaded = false;
    
    // Save immediately to ensure data persistence
    await this.save();
  }

  /**
   * Retrieve a value by key
   */
  async get(key: string): Promise<any> {
    await this.load();
    
    if (!key || typeof key !== "string") {
      throw new Error("Memory key must be a non-empty string");
    }

    const entry = this.data[key];
    if (!entry) {
      throw new Error(`Memory key '${key}' not found`);
    }

    return entry.value;
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    await this.load();
    return key in this.data;
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<void> {
    await this.load();
    
    if (!key || typeof key !== "string") {
      throw new Error("Memory key must be a non-empty string");
    }

    if (key in this.data) {
      delete this.data[key];
      await this.save();
    }
  }

  /**
   * Clear all memory or specific key
   */
  async clear(key?: string): Promise<void> {
    await this.load();
    
    if (key) {
      if (!key || typeof key !== "string") {
        throw new Error("Memory key must be a non-empty string");
      }
      delete this.data[key];
    } else {
      this.data = {};
    }
    
    await this.save();
  }

  /**
   * Search for keys/values matching a query
   */
  async search(query: string): Promise<{ key: string; value: any; timestamp: number; source?: string; instruction?: string }[]> {
    await this.load();
    
    if (!query || typeof query !== "string") {
      throw new Error("Search query must be a non-empty string");
    }

    const results: { key: string; value: any; timestamp: number; source?: string; instruction?: string }[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [key, entry] of Object.entries(this.data)) {
      const keyMatch = key.toLowerCase().includes(lowerQuery);
      const valueMatch = JSON.stringify(entry.value).toLowerCase().includes(lowerQuery);
      const instructionMatch = entry.instruction && entry.instruction.toLowerCase().includes(lowerQuery);
      
      if (keyMatch || valueMatch || instructionMatch) {
        results.push({
          key,
          value: entry.value,
          timestamp: entry.timestamp,
          source: entry.source,
          instruction: entry.instruction
        });
      }
    }

    return results;
  }

  /**
   * List all keys with metadata
   */
  async list(): Promise<{ key: string; timestamp: number; source?: string; instruction?: string }[]> {
    // Force reload to ensure we have latest data
    this.loaded = false;
    await this.load();
    
    return Object.entries(this.data).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      source: entry.source,
      instruction: entry.instruction
    }));
  }

  /**
   * Get memory statistics
   */
  async stats(): Promise<{ totalKeys: number; totalSize: number; lastUpdated: number }> {
    await this.load();
    
    const keys = Object.keys(this.data);
    const totalSize = JSON.stringify(this.data).length;
    const timestamps = keys.map(key => this.data[key].timestamp);
    const lastUpdated = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      totalKeys: keys.length,
      totalSize,
      lastUpdated
    };
  }
}

// Global memory store instance
let globalMemoryStore: MemoryStore | null = null;

/**
 * Get or create the global memory store instance
 */
export const getMemoryStore = (storageDir?: string): MemoryStore => {
  if (!globalMemoryStore) {
    globalMemoryStore = new MemoryStore(storageDir);
  }
  return globalMemoryStore;
};
