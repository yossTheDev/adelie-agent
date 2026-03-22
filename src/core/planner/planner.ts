import { ACTION_ARGS, ACTION_DESCRIPTIONS } from "../actions/actions.js";
import { callOllama } from "../llm/llm.js";
import { getPlannerPromt } from "./prompt.js";

interface PlanAction {
  id: string;
  action: string;
  args: Record<string, any>;
}

interface PlanResponse {
  plan: PlanAction[];
}

export async function generatePlan(
  userInput: string,
  debug: boolean = false,
  isWorker: boolean = false,
): Promise<PlanAction[]> {
  const actionsInfo = Object.entries(ACTION_ARGS).map(([action, args]) => {
    const argsStr = args.length > 0 ? `Args: [${args.join(", ")}]` : "No args";
    const desc = ACTION_DESCRIPTIONS[action] || "No description available";
    return `- ${action}: ${desc}. ${argsStr}`;
  });

  const actionsText = actionsInfo.join("\n");

  // --- PHASE 1: GENERATION PROMPT ---
  const basePrompt = getPlannerPromt({ actionsText, userInput });

  let currentPlanRaw = (await callOllama(
    basePrompt,
    undefined,
    false,
  )) as string;

  // If this is a worker (within a Replan), we don't need QA,
  // since a Replan is typically a straightforward task.
  if (isWorker) {
    try {
      const cleanRaw = currentPlanRaw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanRaw) as PlanResponse;
      return parsed.plan || [];
    } catch (e) {
      return [];
    }
  }

  let parsed: PlanResponse | null = null;

  try {
    const cleanRaw = currentPlanRaw.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleanRaw) as PlanResponse;
  } catch (e) {
    if (debug) console.error("[ERROR] Initial plan parse failed:", e);
    return [];
  }

  // EARLY EXIT: conversation detected
  if (!parsed.plan || parsed.plan.length === 0) {
    if (debug) console.log("[DEBUG] Empty plan detected → skipping QA");
    return [];
  }

  // --- PHASE 2: REFLECTION LOOP ---
  // currentPlanRaw = await newFunction(actionsText, userInput, currentPlanRaw, debug, basePrompt);

  if (debug) {
    console.log("\n[DEBUG] FINAL LLM PLAN:");
    console.log(currentPlanRaw);
  }

  console.log(currentPlanRaw);

  try {
    const cleanRaw = currentPlanRaw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanRaw) as PlanResponse;
    return parsed.plan || [];
  } catch (e) {
    if (debug) console.error("[ERROR] PLANNER PARSE FAILED:", e);
    return [];
  }
}
