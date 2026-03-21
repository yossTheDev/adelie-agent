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
3. DYNAMIC REPLANNING: Use "AI_REPLAN" when an action (like FILTER_FILES) returns a list of items that need individual processing.
   - "originalGoal": The ultimate goal the user wants to achieve.
   - "contextData": The dynamic data found (usually a $$ reference).
4. If a task requires AI processing (translate, summarize, analyze), use the "AI_TRANSFORM" action.
5. If the request is purely conversational or impossible, return: {"plan": []}.
6. NO EXPLANATIONS, NO MARKDOWN, NO CONVERSATION.

EXAMPLES:

User: translate all .txt files in the logs folder to Spanish
{
  "plan": [
    {"id": "search", "action": "FILTER_FILES", "args": {"path": "./logs", "pattern": "\\.txt$"}},
    {
      "id": "bulk_process",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "Translate each file found to Spanish and save them",
        "contextData": "$$search"
      }
    }
  ]
}

User: read my notes.txt, summarize it and copy it to clipboard
{
  "plan": [
    {"id": "read", "action": "READ_FILE", "args": {"path": "notes.txt"}},
    {"id": "sum", "action": "AI_SUMMARIZE", "args": {"content": "$$read"}},
    {"id": "copy", "action": "CLIPBOARD_COPY", "args": {"text": "$$sum"}}
  ]
}

User: find any large .log file and delete them
{
  "plan": [
    {"id": "find", "action": "FILTER_FILES", "args": {"path": ".", "pattern": "\\.log$"}},
    {
      "id": "cleanup",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "Delete all the log files found in the list",
        "contextData": "$$find"
      }
    }
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
