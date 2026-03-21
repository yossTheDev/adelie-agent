import { ACTION_ARGS, ACTION_DESCRIPTIONS } from "../actions/actions.js";
import { callOllama } from "../llm/llm.js";

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
): Promise<PlanAction[]> {
  const actionsInfo = Object.entries(ACTION_ARGS).map(([action, args]) => {
    const argsStr = args.length > 0 ? `Args: [${args.join(", ")}]` : "No args";
    const desc = ACTION_DESCRIPTIONS[action] || "No description available";
    return `- ${action}: ${desc}. ${argsStr}`;
  });

  const actionsText = actionsInfo.join("\n");

  const prompt = `
You are the Strategic Planner for YI Agent. Your goal is to convert a user request into a precise sequence of actions.

AVAILABLE ACTIONS:
${actionsText}

STRICT ARCHITECTURE RULES:
1. Return ONLY a JSON object: {"plan": [{"id": "unique_id", "action": "NAME", "args": {...}}]}.
2. DATA PIPING: To use the output of a previous step, use the syntax "$$step_id" as the argument value.
3. Every step MUST have a unique "id" (e.g., "step1", "read_file", "process_ai").
4. DYNAMIC REPLANNING (Worker Rule):
   - Use "AI_REPLAN" when an action returns a list of items (files, strings) that need individual processing.
   - If the input ALREADY contains a list of items and a goal, DO NOT return another AI_REPLAN. Instead, generate ATOMIC steps for EACH item (e.g., READ_FILE, COPY_FILE).
5. If a task requires AI processing (translate, summarize, analyze), use the "AI_TRANSFORM" action.
6. If the request is purely conversational or impossible, return: {"plan": []}.
7. NO EXPLANATIONS, NO MARKDOWN, NO CONVERSATION.

EXAMPLES:

User: translate all .txt files in the logs folder to English
{
  "plan": [
    {"id": "search", "action": "FILTER_FILES", "args": {"path": "./logs", "pattern": "\\.txt$"}},
    {
      "id": "bulk_process",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "Translate each file found to English",
        "contextData": "$$search"
      }
    }
  ]
}

User: CONTEXT: The user wanted: "Translate file names to English". DATA FOUND: "C:/Hola.txt, C:/Mundo.txt"
{
  "plan": [
    {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Translate 'Hola.txt' to English", "content": "Hola.txt"}},
    {"id": "c1", "action": "COPY_FILE", "args": {"src": "C:/Hola.txt", "dest": "C:/$$t1"}},
    {"id": "t2", "action": "AI_TRANSFORM", "args": {"task": "Translate 'Mundo.txt' to English", "content": "Mundo.txt"}},
    {"id": "c2", "action": "COPY_FILE", "args": {"src": "C:/Mundo.txt", "dest": "C:/$$t2"}}
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
