import type { ActionResult } from "../../../types/action-result.js";
import { getMemoryStore } from "../../memory/memory-store.js";
import { callOllama } from "../../llm/llm.js";

/**
 * Store a value in persistent memory with AI processing for intelligent storage
 */
export const memorySet = async (args: {
  key: string;
  value: any;
  source?: string;
  instruction?: string; // Optional AI instruction for processing
}): Promise<ActionResult> => {
  try {
    if (!args.key || args.value === undefined) {
      return [false, "MEMORY_SET requires 'key' and 'value' parameters"];
    }

    let processedValue = args.value;
    let processedInstruction = args.instruction;
    
    // If value is a string and there's an instruction, process with AI
    if (typeof args.value === "string" && args.instruction && args.instruction.trim() !== "") {
      const internalPrompt = `
        [SYSTEM: MEMORY PROCESSOR]
        TASK: ${args.instruction}
        INPUT_DATA: "${args.value}"

        INSTRUCTION: Process INPUT_DATA based on TASK for memory storage.
        Return ONLY a JSON object with "data" and "instruction" fields.
        Do not include explanations or conversational filler.
        Format: {"data": "...", "instruction": "..."}
      `;

      try {
        const aiResult = await callOllama(internalPrompt, undefined, false);
        let cleanResult = (aiResult as string)
          .replace(/```[\s\S]*?```/g, "")
          .trim();
        
        // Try to extract JSON from response
        const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanResult = jsonMatch[0];
        }

        // Try to parse as JSON with data and instruction
        try {
          const parsed = JSON.parse(cleanResult);
          if (parsed.data !== undefined) {
            processedValue = parsed.data;
          }
          if (parsed.instruction !== undefined) {
            processedInstruction = parsed.instruction;
          }
        } catch {
          // Fallback: use original value and instruction
          processedValue = args.value;
          processedInstruction = args.instruction;
        }
      } catch (aiError) {
        // If AI processing fails, use original value
        console.warn(`AI processing failed for memory key '${args.key}': ${String(aiError)}`);
        processedValue = args.value;
        processedInstruction = args.instruction;
      }
    }

    const memoryStore = getMemoryStore();
    
    await memoryStore.set(args.key, processedValue, args.source, processedInstruction);
    
    return [true, `Stored processed value in memory under key '${args.key}'${processedInstruction ? ' with AI instruction' : ''}`];
  } catch (error) {
    return [false, `MEMORY_SET Error: ${String(error)}`];
  }
};

/**
 * Delete a key from persistent memory
 */
export const memoryDelete = async (args: { key: string }): Promise<ActionResult> => {
  try {
    if (!args.key) {
      return [false, "MEMORY_DELETE requires 'key' parameter"];
    }

    const memoryStore = getMemoryStore();
    await memoryStore.delete(args.key);
    
    return [true, `Deleted memory key '${args.key}'`];
  } catch (error) {
    return [false, `MEMORY_DELETE Error: ${String(error)}`];
  }
};

/**
 * Clear memory (all keys or specific key)
 */
export const memoryClear = async (args: { key?: string }): Promise<ActionResult> => {
  try {
    const memoryStore = getMemoryStore();
    await memoryStore.clear(args.key);
    
    if (args.key) {
      return [true, `Cleared memory key '${args.key}'`];
    } else {
      return [true, "Cleared all memory keys"];
    }
  } catch (error) {
    return [false, `MEMORY_CLEAR Error: ${String(error)}`];
  }
};

/**
 * Search for keys/values matching a query
 */
export const memorySearch = async (args: { query: string }): Promise<ActionResult> => {
  try {
    if (!args.query) {
      return [false, "MEMORY_SEARCH requires 'query' parameter"];
    }

    const memoryStore = getMemoryStore();
    const results = await memoryStore.search(args.query);
    
    if (results.length === 0) {
      return [true, `No results found for query '${args.query}'`];
    }

    const formattedResults = results.map(result => ({
      key: result.key,
      value: result.value,
      timestamp: new Date(result.timestamp).toISOString(),
      source: result.source
    }));

    return [true, formattedResults];
  } catch (error) {
    return [false, `MEMORY_SEARCH Error: ${String(error)}`];
  }
};

/**
 * List all memory keys with metadata
 */
export const memoryList = async (args: {}): Promise<ActionResult> => {
  try {
    const memoryStore = getMemoryStore();
    const results = await memoryStore.list();
    
    if (results.length === 0) {
      return [true, "No memory keys found"];
    }

    const formattedResults = results.map(result => ({
      key: result.key,
      timestamp: new Date(result.timestamp).toISOString(),
      source: result.source
    }));

    return [true, formattedResults];
  } catch (error) {
    return [false, `MEMORY_LIST Error: ${String(error)}`];
  }
};

/**
 * Get memory statistics
 */
export const memoryStats = async (args: {}): Promise<ActionResult> => {
  try {
    const memoryStore = getMemoryStore();
    const stats = await memoryStore.stats();
    
    const formattedStats = {
      totalKeys: stats.totalKeys,
      totalSize: `${stats.totalSize} bytes`,
      lastUpdated: stats.lastUpdated > 0 ? new Date(stats.lastUpdated).toISOString() : 'Never'
    };

    return [true, formattedStats];
  } catch (error) {
    return [false, `MEMORY_STATS Error: ${String(error)}`];
  }
};

export const ACTIONS: Record<
  string,
  (args: any) => ActionResult | Promise<ActionResult>
> = {
  MEMORY_SET: (args) => memorySet(args),
  MEMORY_DELETE: (args) => memoryDelete(args),
  MEMORY_CLEAR: (args) => memoryClear(args),
  MEMORY_SEARCH: (args) => memorySearch(args),
  MEMORY_LIST: (args) => memoryList(args),
  MEMORY_STATS: (args) => memoryStats(args),
};

export const ACTION_ARGS: Record<string, string[]> = {
  MEMORY_SET: ["key", "value", "source?", "instruction?"],
  MEMORY_DELETE: ["key"],
  MEMORY_CLEAR: ["key?"],
  MEMORY_SEARCH: ["query"],
  MEMORY_LIST: [],
  MEMORY_STATS: [],
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  MEMORY_SET: "Store a value in persistent memory with optional AI processing and source tracking",
  MEMORY_DELETE: "Delete a specific key from persistent memory",
  MEMORY_CLEAR: "Clear all memory or a specific key if provided",
  MEMORY_SEARCH: "Search for keys and values matching a query string",
  MEMORY_LIST: "List all memory keys with metadata (timestamps, sources)",
  MEMORY_STATS: "Get memory statistics (total keys, size, last updated)",
};
