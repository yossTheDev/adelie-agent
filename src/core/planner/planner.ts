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
You are the Strategic Planner for YI Agent. Convert the user request into a precise, deterministic sequence of actions.

AVAILABLE ACTIONS:
${actionsText}

STRICT ARCHITECTURE RULES:
1. FORMAT: Return ONLY a valid JSON object: {"plan": [{"id": "unique_id", "action": "NAME", "args": {...}}]}.
2. DATA PIPING: To use the output of a previous step, use the exact syntax "$$step_id" as the argument value.
3. UNIQUE IDs: Every step MUST have a short, unique "id" (e.g., "s1", "read1", "trans1").
4. FILES VS DIRECTORIES: Pay strict attention to whether the user asks for files or folders. Use regex patterns in FILTER_FILES (e.g., "\\.txt$" for text files, "\\..+$" for any file) to ensure you only target the requested type and avoid directories.
5. BULK ACTIONS VS REPLANNING:
   - If an action natively accepts a list/array (like DELETE_FILES, COPY_FILES, MOVE_FILES), pass the piped list directly (e.g., "$$filter1") to the bulk action. DO NOT use AI_REPLAN for these.
   - Use "AI_REPLAN" ONLY when an action returns a list of items that require INDIVIDUAL, complex processing (e.g., reading each file, transforming its content, and writing it back).
   - When using AI_REPLAN, pass a highly descriptive "originalGoal" and use "$$step_id" for "contextData".
6. AI_TRANSFORM: Use this ONLY for text/data manipulation (translating, summarizing, analyzing). It returns a string.
7. WORKER RULE: If the input ALREADY contains a list of items and a goal (e.g., "CONTEXT: ... DATA FOUND: ..."), DO NOT return AI_REPLAN. Generate ATOMIC steps for EACH item.
8. NO EXPLANATIONS, NO MARKDOWN, NO CONVERSATION.

EXAMPLES:

User: translate all .txt files in the logs folder to English
{
  "plan": [
    {"id": "s1", "action": "FILTER_FILES", "args": {"path": "./logs", "pattern": "\\\\.txt$"}},
    {
      "id": "replan1",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "Read each .txt file, translate its content to English, and write the translated content back",
        "contextData": "$$s1"
      }
    }
  ]
}

User: move all images from ./downloads to ./images
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./downloads", "pattern": "\\\\.(jpg|jpeg|png|gif)$"}},
    {"id": "m1", "action": "MOVE_FILES", "args": {"files": "$$f1", "dest": "./images"}}
  ]
}

User: summarize the file report.txt and save it as summary.txt
{
  "plan": [
    {"id": "r1", "action": "READ_FILE", "args": {"path": "report.txt"}},
    {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Summarize the text", "content": "$$r1"}},
    {"id": "w1", "action": "WRITE_FILE", "args": {"path": "summary.txt", "content": "$$t1"}}
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
