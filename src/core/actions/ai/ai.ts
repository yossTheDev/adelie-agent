import type { ActionResult } from "../../../types/action-result.js";
import { callOllama } from "../../llm/llm.js";
import { generatePlan } from "../../planner/planner.js";

/**
 * Executes a specific AI task on a given text.
 * This is a deterministic wrapper for the LLM.
 */
export const aiTransform = async (args: {
  task: string;
  content: string;
}): Promise<ActionResult> => {
  try {
    if (!args.content) return [false, "No content provided to AI_TRANSFORM"];

    // We wrap the user task in a strict system instruction
    // to ensure the 7B model doesn't drift into conversation.
    const internalPrompt = `
      [SYSTEM: CORE DATA PROCESSOR]
      TASK: ${args.task}
      INPUT_DATA: "${args.content}"

      INSTRUCTION: Process the INPUT_DATA based on the TASK.
      Return ONLY the resulting text. Do not explain, do not apologize,
      do not add conversational filler.
    `;

    const result = await callOllama(internalPrompt, undefined, false);

    // Clean potential markdown artifacts from the 7B model
    const cleanResult = (result as string)
      .replace(/```[\s\S]*?```/g, "")
      .trim();

    return [true, cleanResult];
  } catch (e) {
    return [false, `AI_TRANSFORM Error: ${String(e)}` || "Unknown LLM error"];
  }
};

/**
 * Summarizes long text into a shorter version.
 * Predefined AI task for better reliability.
 */
export const aiSummarize = async (args: {
  content: string;
}): Promise<ActionResult> => {
  return await aiTransform({
    task: "Summarize this text concisely",
    content: args.content,
  });
};

export const ACTIONS: Record<
  string,
  (args: any) => ActionResult | Promise<ActionResult>
> = {
  AI_TRANSFORM: (args) => aiTransform(args),
  AI_SUMMARIZE: (args) => aiSummarize(args),
};

export const ACTION_ARGS: Record<string, string[]> = {
  AI_TRANSFORM: ["task", "content"],
  AI_SUMMARIZE: ["content"],
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  AI_TRANSFORM:
    "Uses AI to transform or process text based on a specific task (e.g., translate, format).",
  AI_SUMMARIZE: "Uses AI to create a concise summary of the provided text.",
};
