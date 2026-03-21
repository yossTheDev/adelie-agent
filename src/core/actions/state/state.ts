import type { ActionResult } from "../../../types/action-result.js";

/**
 * Internal buffer to store temporary data during plan execution.
 * This allows the agent to accumulate information from multiple steps.
 */
let memoryBuffer: Record<string, string[]> = {};

/**
 * Clears the internal memory buffer.
 * Should be called manually at the end of the full plan execution.
 */
export const clearAIContext = () => {
  memoryBuffer = {};
};

/**
 * Appends text content to a specific key in the memory buffer.
 */
export const stateAppend = (args: {
  key: string;
  content: string;
}): ActionResult => {
  try {
    if (!args.key || args.content === undefined) {
      return [false, "Missing key or content for STATE_APPEND"];
    }
    if (!memoryBuffer[args.key]) memoryBuffer[args.key] = [];

    memoryBuffer[args.key].push(String(args.content));
    return [
      true,
      `Added to '${args.key}' (Total items: ${memoryBuffer[args.key].length})`,
    ];
  } catch (e) {
    return [false, `STATE_APPEND Error: ${String(e)}`];
  }
};

/**
 * Retrieves and joins all content stored under a specific key.
 */
export const stateGet = (args: { key: string }): ActionResult => {
  try {
    const data = memoryBuffer[args.key];
    if (!data || data.length === 0) return [true, ""];

    // Joins the accumulated data with newlines for context clarity
    return [true, data.join("\n---\n")];
  } catch (e) {
    return [false, `STATE_GET Error: ${String(e)}`];
  }
};

export const ACTIONS: Record<
  string,
  (args: any) => ActionResult | Promise<ActionResult>
> = {
  STATE_APPEND: (args) => stateAppend(args),
  STATE_GET: (args) => stateGet(args),
};

export const ACTION_ARGS: Record<string, string[]> = {
  STATE_APPEND: ["key", "content"],
  STATE_GET: ["key"],
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  STATE_APPEND:
    "Saves text into a temporary named buffer. Use this to collect info from multiple sources/files.",
  STATE_GET:
    "Retrieves all text collected in a buffer as a single combined string.",
};
