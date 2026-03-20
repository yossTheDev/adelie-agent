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
4. If a task requires AI processing (translate, summarize, analyze), use the "AI_TRANSFORM" action.
5. If the request is purely conversational or impossible, return: {"plan": []}.
6. NO EXPLANATIONS, NO MARKDOWN, NO CONVERSATION.

EXAMPLES:

User: lee notas.txt, tradúcelo a inglés y cópialo al portapapeles
{
  "plan": [
    {"id": "f1", "action": "READ_FILE", "args": {"path": "notas.txt"}},
    {"id": "a1", "action": "AI_TRANSFORM", "args": {"task": "Translate to English", "content": "$$f1"}},
    {"id": "c1", "action": "CLIPBOARD_COPY", "args": {"text": "$$a1"}}
  ]
}

User: busca el clima de hoy y guárdalo en clima.txt
{
  "plan": [
    {"id": "web", "action": "BROWSER_SEARCH", "args": {"query": "clima hoy"}},
    {"id": "save", "action": "WRITE_FILE", "args": {"path": "clima.txt", "content": "$$web"}}
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
