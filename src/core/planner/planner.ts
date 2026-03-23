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

const normalizeStructure = (action: string, args: Record<string, any>) => {
  if (action === "FOR_EACH") {
    const template = args.template;
    if (Array.isArray(template)) return args;
    if (template && typeof template === "object") {
      return { ...args, template: [template] };
    }
  }

  if (action === "IF") {
    return {
      ...args,
      then: Array.isArray(args.then) ? args.then : [],
      else: Array.isArray(args.else) ? args.else : [],
    };
  }

  if (action === "WHILE") {
    return {
      ...args,
      body: Array.isArray(args.body) ? args.body : [],
    };
  }

  return args;
};

const sanitizePlan = (raw: unknown): PlanAction[] => {
  const allowedActions = new Set(Object.keys(ACTION_ARGS));
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const safe: PlanAction[] = [];

  for (const step of raw) {
    if (!step || typeof step !== "object") continue;
    const rawId = String((step as any).id || "").trim();
    const action = String((step as any).action || "").trim().toUpperCase();
    const args = (step as any).args && typeof (step as any).args === "object"
      ? ({ ...(step as any).args } as Record<string, any>)
      : {};

    if (!rawId || !action) continue;
    if (!allowedActions.has(action)) continue;

    const id = seen.has(rawId) ? `${rawId}_${safe.length + 1}` : rawId;
    seen.add(id);

    const allowedArgs = new Set(ACTION_ARGS[action] || []);
    const filteredArgs: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      if (allowedArgs.has(key)) filteredArgs[key] = value;
    }

    safe.push({
      id,
      action,
      args: normalizeStructure(action, filteredArgs),
    });
  }

  return safe;
};

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

  if (debug) {
    console.log("\n[DEBUG] FINAL LLM PLAN:");
    console.log(currentPlanRaw);
  }

  try {
    const cleanRaw = currentPlanRaw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanRaw) as PlanResponse;
    return sanitizePlan(parsed.plan || []);
  } catch (e) {
    if (debug) console.error("[ERROR] PLANNER PARSE FAILED:", e);
    return [];
  }
}
