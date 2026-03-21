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

CRITICAL FIRST STEP:
Evaluate if the user input requires executing available actions or if it is a general conversation.
- If it is a greeting, casual chat, or general question that DOES NOT require the available actions, YOU MUST return exactly: {"plan": []}.
- ONLY generate a sequence of actions if the request explicitly maps to the capabilities listed below.

AVAILABLE ACTIONS:
${actionsText}

STRICT ARCHITECTURE RULES:
1. FORMAT: Return ONLY a valid JSON object: {"plan": [{"id": "unique_id", "action": "NAME", "args": {...}}]}.
2. DATA PIPING: To use the output of a previous step, use the exact syntax "$$step_id" as the argument value.
3. UNIQUE IDs: Every step MUST have a short, unique "id" (e.g., "s1", "read1", "trans1").
4. FILES VS DIRECTORIES: Pay strict attention to whether the user asks for files or folders. Use regex patterns in FILTER_FILES (e.g., "\\\\.txt$" for text files, "\\\\..+$" for any file) to ensure you only target the requested type and avoid directories.
5. BULK ACTIONS VS REPLANNING:
   - If an action natively accepts a list/array (like DELETE_FILES, COPY_FILES, MOVE_FILES), pass the piped list directly (e.g., "$$filter1") to the bulk action. DO NOT use AI_REPLAN for these.
   - Use "AI_REPLAN" ONLY when an action returns a list of items that require INDIVIDUAL, complex processing (e.g., reading each file, transforming its content, and writing it back).
   - When using AI_REPLAN, pass a highly descriptive "originalGoal" and use "$$step_id" for "contextData".
6. AI_TRANSFORM: Use this ONLY for text/data manipulation (translating, summarizing, analyzing). It returns a string.
7. WORKER RULE: If the input ALREADY contains a list of items and a goal (e.g., "CONTEXT: ... DATA FOUND: ..."), DO NOT return AI_REPLAN. Generate ATOMIC steps for EACH item.
8. NO EXPLANATIONS, NO MARKDOWN, NO CONVERSATION.

MANDATORY DATA FLOW RULES (CRITICAL):
- NEVER duplicate or rewrite data that originates from a previous step.
- ALWAYS use "$$step_id" when an argument depends on a previous step output.
- If a step logically depends on another step, it MUST reference it using "$$".
- Hardcoded values are FORBIDDEN if they can be derived from a previous step.
- Any violation of this rule makes the plan INVALID.

DATA PIPING CONSTRAINTS:
- "$$step_id" must be used as a FULL value, not inside strings.
- DO NOT concatenate strings with $$ (e.g., "C:/$$step1" is INVALID).
- Always pass "$$step_id" directly as the argument value.

DEPENDENCY ENFORCEMENT:
- Before generating the plan, identify dependencies between steps.
- For each step:
  - Ask: "Does this depend on previous data?"
  - If YES → MUST use "$$step_id"
  - If NO → use literal values
- Plans that ignore dependencies are INVALID.

PATH VALIDATION RULES (CRITICAL):
- Any argument representing a file path (e.g., "src", "dest", "path") MUST be a valid full path or a valid directory path.
- NEVER use plain filenames (e.g., "file.txt") as a destination unless explicitly required.
- If transforming filenames (e.g., translation), you MUST combine the result with a valid base path.
- If a directory was created or provided earlier, you MUST use "$$step_id" to reference it.

INVALID:
{"dest": "$$t1"}

VALID:
{"dest": "$$dir1"}

EXAMPLES:

User: Hello, who are you?
{
  "plan": []
}

User: translate all .txt files in the logs folder to English
{
  "plan": [
    {"id": "s1", "action": "FILTER_FILES", "args": {"path": "./logs", "pattern": "\\\\.txt$"}},
    {
      "id": "replan1",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "Read each file, translate its content to English, and overwrite the file",
        "contextData": "$$s1"
      }
    }
  ]
}

User: move all images from ./downloads to ./images
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./downloads", "pattern": "\\.(jpg|jpeg|png|gif)$"}},
    {"id": "m1", "action": "MOVE_FILES", "args": {"files": "$$f1", "dest": "./images"}}
  ]
}

User: summarize the file report.txt and save it as summary.txt
{
  "plan": [
    {"id": "r1", "action": "READ_FILE", "args": {"path": "./report.txt"}},
    {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Summarize the text", "content": "$$r1"}},
    {"id": "w1", "action": "WRITE_FILE", "args": {"path": "./summary.txt", "content": "$$t1"}}
  ]
}

User: CONTEXT: The user wanted: "Translate file names to English". DATA FOUND: "C:/Hola.txt, C:/Mundo.txt"
{
  "plan": [
    {"id": "d1", "action": "MAKE_DIRECTORY", "args": {"path": "C:/translated"}},
    {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Translate 'Hola.txt' to English", "content": "Hola.txt"}},
    {"id": "c1", "action": "COPY_FILE", "args": {"src": "C:/Hola.txt", "dest": "$$d1"}},
    {"id": "t2", "action": "AI_TRANSFORM", "args": {"task": "Translate 'Mundo.txt' to English", "content": "Mundo.txt"}},
    {"id": "c2", "action": "COPY_FILE", "args": {"src": "C:/Mundo.txt", "dest": "$$d1"}}
  ]
}

User: Delete all folders under C:/Documents/test

{
  "plan": [
    {"id": "d1", "action": "LIST_DIRECTORIES", "args": {"path": " C:/Documents/test"}},
    {
      "id": "replan1",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "Delete earch folder under C:/Documents/test",
        "contextData": "$$d1"
      }
    }
  ]
}

Replan:

{
  "plan": [
    {"id": "d1", "action": "DELETE_DIRECTORY", "args": {"path": " C:/Documents/test/test1"}},
    {"id": "d1", "action": "DELETE_DIRECTORY", "args": {"path": " C:/Documents/test/test2"}},
  ]
}


DATA PIPING RULES:
- Use "$$id" to inject the output of a previous step into the arguments of a current step.
- NEVER use "$$" inside strings.
- ALWAYS use "$$" when referencing previous results.

EXAMPLE DATA PIPING:

User: Find all .log files in ./tmp, read "error.log" and then delete all those found .log files.
{
  "plan": [
    {
      "id": "search_logs",
      "action": "FILTER_FILES",
      "args": {"path": "./tmp", "pattern": "\\\\.log$"}
    },
    {
      "id": "read_error",
      "action": "READ_FILE",
      "args": {"path": "./tmp/error.log"}
    },
    {
      "id": "cleanup",
      "action": "DELETE_FILES",
      "args": {"files": "$$search_logs"}
    }
  ]
}
User input: ${userInput}
`;

  const raw = (await callOllama(prompt, undefined, false)) as string;

  if (true) {
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
