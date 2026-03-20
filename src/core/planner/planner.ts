import { ACTION_ARGS } from "../actions/actions.js";
import { callOllama } from "../llm/llm.js";

interface PlanAction {
  action: string;
  args: Record<string, any>;
}

interface PlanResponse {
  plan: PlanAction[];
}

export async function generatePlan(
  userInput: string,
  debug: boolean = false,
): Promise<PlanAction[]> {
  const actionsInfo = Object.entries(ACTION_ARGS).map(([action, args]) => {
    const argsStr = args.length > 0 ? args.join(", ") : "no args";
    return `- ${action}: ${argsStr}`;
  });

  const actionsText = actionsInfo.join("\n");

  const prompt = `
You are a Task Planner Agent. Your job is to break down a user request into a sequence of discrete actions.

Available Actions:
${actionsText}

STRICT RULES:
1. Return ONLY a JSON object with a "plan" key containing a list of actions.
2. If the request needs only one action, still return a list with one item.
3. If the request is impossible, return: {"plan": []}
4. No conversational text, no explanations, no markdown blocks.
5. Use only the provided action names and arguments.

Examples:
User: crea una carpeta llamada backup y mueve notas.txt alli
{
  "plan": [
    {"action": "MAKE_DIRECTORY", "args": {"path": "backup"}},
    {"action": "MOVE_FILE", "args": {"src": "notas.txt", "dest": "backup/notas.txt"}}
  ]
}

User: que hora es
{
  "plan": [
    {"action": "SYSTEM_TIME", "args": {}}
  ]
}

User input: ${userInput}
`;

  const raw = (await callOllama(prompt, undefined, false)) as string;

  if (debug) {
    console.log("\n[DEBUG] RAW LLM PLANNER:");
    console.log(raw);
  }

  try {
    // Clean potential markdown backticks if the LLM ignores the rule
    const cleanRaw = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanRaw) as PlanResponse;

    if (parsed.plan && Array.isArray(parsed.plan)) {
      if (debug) {
        console.log(`[DEBUG] PLAN GENERATED: ${parsed.plan.length} steps.`);
      }
      return parsed.plan;
    }
    return [];
  } catch (e) {
    if (debug) {
      console.error("[ERROR] PLANNER PARSE FAILED:", e);
    }
    return [];
  }
}
