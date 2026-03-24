import type { ActionResult } from "../../../types/action-result.js";

/**
 * Uses a predefined skill template to execute a sequence of actions
 */
export const useSkill = async (args: {
  skill: string;
  inputs?: Record<string, any>;
}): Promise<ActionResult> => {
  try {
    if (!args.skill) {
      return [false, "USE_SKILL requires 'skill' parameter"];
    }

    // This action is handled at the planner level by expanding the skill template
    // So this should never be called directly by the executor
    return [
      false, 
      "USE_SKILL should be expanded by the planner before execution"
    ];
  } catch (error) {
    return [false, `USE_SKILL Error: ${String(error)}`];
  }
};

export const ACTIONS = {
  USE_SKILL: useSkill,
};

export const ACTION_ARGS = {
  USE_SKILL: ["skill", "inputs"],
};

export const ACTION_DESCRIPTIONS = {
  USE_SKILL: "Uses a predefined skill template to execute a sequence of actions with the given inputs",
};
