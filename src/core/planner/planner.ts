import { ACTION_ARGS, ACTION_DESCRIPTIONS } from "../actions/actions.js";
import { buildMcpPlannerToolsText } from "../config/mcp-config.js";
import { callOllama } from "../llm/llm.js";
import { getPlannerPromt } from "./prompt.js";
import { SkillLoader } from "../skills/skill-loader.js";
import { getMemoryStore } from "../memory/memory-store.js";

function formatPlannerMemoryValue(key: string, value: any, source?: string): string {
  const sourceInfo = source ? ` (source: ${source})` : "";
  
  if (typeof value === 'string') {
    return `📍 ${key}: "${value}"${sourceInfo}`;
  } else if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return `📋 ${key}: Array[${value.length}] [${value.slice(0, 3).map(item => JSON.stringify(item)).join(', ')}${value.length > 3 ? '...' : ''}]${sourceInfo}`;
    } else {
      const keys = Object.keys(value);
      return `🗂️ ${key}: Object{${keys.join(', ')}}${sourceInfo}`;
    }
  } else if (typeof value === 'boolean') {
    return `✅ ${key}: ${value ? 'TRUE' : 'FALSE'}${sourceInfo}`;
  } else if (typeof value === 'number') {
    return `🔢 ${key}: ${value}${sourceInfo}`;
  } else {
    return `❓ ${key}: ${JSON.stringify(value)}${sourceInfo}`;
  }
}

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
    const action = String((step as any).action || "")
      .trim()
      .toUpperCase();
    const args =
      (step as any).args && typeof (step as any).args === "object"
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

let plannerLoadedMemory: string = "";

const loadPlannerMemory = async (): Promise<void> => {
  try {
    const memoryStore = getMemoryStore();
    const allMemory = await memoryStore.list();
    
    if (allMemory.length === 0) {
      plannerLoadedMemory = "";
      return;
    }

    const memoryTexts: string[] = [];
    for (const entry of allMemory) {
      const value = await memoryStore.get(entry.key);
      const formattedValue = formatPlannerMemoryValue(entry.key, value, entry.source);
      memoryTexts.push(formattedValue);
    }

    plannerLoadedMemory = memoryTexts.length > 0
      ? `Planner Memory Context (use for decision making):\n${memoryTexts.join("\n")}\n`
      : "";
  } catch {
    plannerLoadedMemory = "";
  }
};

export { loadPlannerMemory };

const getPlannerMemoryContext = (userInput: string): string => {
  return plannerLoadedMemory;
};

const expandSkillsInPlan = (plan: PlanAction[]): PlanAction[] => {
  const expandedPlan: PlanAction[] = [];
  
  for (const step of plan) {
    if (step.action === "USE_SKILL") {
      try {
        const skillName = step.args?.skill;
        const skillInputs = step.args?.inputs || {};
        
        if (!skillName) {
          console.warn("USE_SKILL action missing 'skill' parameter");
          continue;
        }
        
        const expandedTemplate = SkillLoader.expandSkillTemplate(skillName, skillInputs);
        if (expandedTemplate) {
          // Add expanded steps with unique IDs
          for (let i = 0; i < expandedTemplate.length; i++) {
            const templateStep = expandedTemplate[i];
            expandedPlan.push({
              ...templateStep,
              id: `${step.id}_${templateStep.id}_${i}`
            });
          }
        } else {
          console.warn(`Failed to expand skill: ${skillName}`);
        }
      } catch (error) {
        console.error(`Error expanding skill in step ${step.id}:`, error);
      }
    } else {
      expandedPlan.push(step);
    }
  }
  
  return expandedPlan;
};

export async function generatePlan(
  userInput: string,
  debug: boolean = false,
  isWorker: boolean = false,
): Promise<PlanAction[]> {
  // CRITICAL: Load memory BEFORE planning
  await loadPlannerMemory();
  
  // Load skills for context
  await SkillLoader.loadAllSkills();
  const skillsText = SkillLoader.getSkillsForPlanner();

  // Load all memory once at startup
  const memoryContext = getPlannerMemoryContext(userInput);

  const actionsInfo = Object.entries(ACTION_ARGS).map(([action, args]) => {
    const argsStr = args.length > 0 ? `Args: [${args.join(", ")}]` : "No args";
    const desc = ACTION_DESCRIPTIONS[action] || "No description available";
    return `- ${action}: ${desc}. ${argsStr}`;
  });

  const actionsText = actionsInfo.join("\n");
  const mcpToolsText = buildMcpPlannerToolsText();

  // --- PHASE 1: GENERATION PROMPT ---
  const basePrompt = getPlannerPromt({ actionsText, mcpToolsText, skillsText, userInput, memoryContext });

  let currentPlanRaw = (await callOllama(
    basePrompt,
    undefined,
    false,
  )) as string;

  console.log(currentPlanRaw)

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

  // Expand skills in the plan
  const expandedPlan = expandSkillsInPlan(parsed.plan);

  if (debug) {
    console.log("\n[DEBUG] FINAL LLM PLAN:");
    console.log(currentPlanRaw);
  }

  try {
    const cleanRaw = currentPlanRaw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanRaw) as PlanResponse;
    return sanitizePlan(expandedPlan);
  } catch (e) {
    if (debug) console.error("[ERROR] PLANNER PARSE FAILED:", e);
    return [];
  }
}
