import type { ActionResult } from "../../../types/action-result.js";
import { callOllama } from "../../llm/llm.js";

/**
 * Evaluates a condition and returns a boolean-like string.
 * This is used to trigger different paths in AI_REPLAN.
 */
export const logicGate = async (args: {
  condition: string;
  data: string;
}): Promise<ActionResult> => {
  try {
    const prompt = `
      [LOGIC GATE]
      DATA: "${args.data}"
      CONDITION: "${args.condition}"

      Does the DATA meet the CONDITION?
      Return ONLY "TRUE" or "FALSE". No explanation.
    `;
    const result = await callOllama(prompt, undefined, false);
    const clean = (result as string).trim().toUpperCase();

    return [true, clean.includes("TRUE") ? "TRUE" : "FALSE"];
  } catch (e) {
    return [false, `LOGIC_GATE Error: ${String(e)}`];
  }
};

export const ACTIONS: Record<
  string,
  (args: any) => ActionResult | Promise<ActionResult>
> = {
  LOGIC_GATE: (args) => logicGate(args),
};

export const ACTION_ARGS: Record<string, string[]> = {
  LOGIC_GATE: ["condition", "data"],
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  LOGIC_GATE:
    "Evaluates if 'data' meets a specific 'condition'. Returns ONLY 'TRUE' or 'FALSE'. Use this before an AI_REPLAN to create conditional workflows.",
};
