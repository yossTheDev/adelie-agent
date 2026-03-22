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
  isWorker: boolean = false,
): Promise<PlanAction[]> {
  const actionsInfo = Object.entries(ACTION_ARGS).map(([action, args]) => {
    const argsStr = args.length > 0 ? `Args: [${args.join(", ")}]` : "No args";
    const desc = ACTION_DESCRIPTIONS[action] || "No description available";
    return `- ${action}: ${desc}. ${argsStr}`;
  });

  const actionsText = actionsInfo.join("\n");

  // --- PHASE 1: GENERATION PROMPT ---
  const basePrompt = `
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
7. CREATE VS UPDATE (CRITICAL):
   - Use **CREATE_FILE** ONLY for brand new files. If the user says "create", "new file", or "save as NEW", use this.
   - Use **UPDATE_FILE** ONLY for existing files. If the user says "modify", "append", "change content", or "overwrite", use this.
   - NEVER use CREATE_FILE if you are not sure if the file exists; use a LOGIC_GATE first if necessary.
8. WORKER RULE: If the input ALREADY contains a list of items and a goal (e.g., "CONTEXT: ... DATA FOUND: ..."), DO NOT return AI_REPLAN. Generate ATOMIC steps for EACH item.
9. INFORMATION ACCUMULATION:
   - When you need to process MULTIPLE items and then give a SINGLE final result (like summarizing several files), use the "Buffer Pattern".
   - Step A: AI_REPLAN to generate steps that use STATE_APPEND for each item.
   - Step B: Use STATE_GET to retrieve the combined string.
   - Step C: Use AI_TRANSFORM or AI_SUMMARIZE on the combined string.
9. VARIABLE PERSISTENCE (CRITICAL):
    - If a task involves multiple phases (Check -> Gate -> Replan), ALWAYS save the original targets (paths, names, or content) in a buffer named 'task_context' using STATE_APPEND at the very beginning.
    - This ensures the Worker in AI_REPLAN can retrieve these values using STATE_GET.
10. CONDITIONAL EXECUTION (CRITICAL):
    - When the user specifies a condition (e.g., "if", "when"), you MUST use LOGIC_GATE.
    - Pattern: [Action to get data] -> [LOGIC_GATE] -> [DIRECT ACTION]
    - DO NOT use AI_REPLAN for simple conditions involving a single action.
    - The step immediately after LOGIC_GATE will be conditionally executed by the executor.
    - The planner MUST assume the executor will skip the next step if the condition is FALSE.
11. LOGIC_GATE SCOPE RULE:
  - A LOGIC_GATE ONLY affects the IMMEDIATELY NEXT step.
  - The next step is conditionally executed based on the gate result.
  - After that, execution MUST continue normally.
  - NEVER assume global conditions or long chains.
12. NO REPLAN FOR SIMPLE CONDITIONS (CRITICAL):
  - NEVER use AI_REPLAN when the condition leads to a SINGLE action (e.g., UPDATE_FILE, DELETE_FILE, CREATE_FILE).
  - AI_REPLAN is ONLY for loops or multi-step processing of lists.
13. NO EXPLANATIONS, NO MARKDOWN, NO CONVERSATION.


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
- NEVER use READ_FILE to verify if a file or folder exists, use CHECK_EXISTS instead to verify if a folder or file exists
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

User: create a new file named notes.txt with the text "Hello World"
{
  "plan": [
    {"id": "c1", "action": "CREATE_FILE", "args": {"path": "./notes.txt", "content": "Hello World"}}
  ]
}

User: modify the file config.json to change the version to 2.0
{
  "plan": [
    {"id": "r1", "action": "READ_FILE", "args": {"path": "./config.json"}},
    {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Change version to 2.0", "content": "$$r1"}},
    {"id": "u1", "action": "UPDATE_FILE", "args": {"path": "./config.json", "content": "$$t1"}}
  ]
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

User: Read all .txt files in ./docs and give me a single summary of everything.
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./docs", "pattern": "\\\\.txt$"}},
    {
      "id": "collect",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "Read each file and use STATE_APPEND with key 'docs_buffer' to save their content",
        "contextData": "$$f1"
      }
    },
    {"id": "merged", "action": "STATE_GET", "args": {"key": "docs_buffer"}},
    {"id": "final_sum", "action": "AI_SUMMARIZE", "args": {"content": "$$merged"}}
  ]
}

User: CONTEXT: Read each file and use STATE_APPEND with key 'docs_buffer'. DATA FOUND: "C:/a.txt, C:/b.txt"
{
  "plan": [
    {"id": "r1", "action": "READ_FILE", "args": {"path": "C:/a.txt"}},
    {"id": "s1", "action": "STATE_APPEND", "args": {"key": "docs_buffer", "content": "$$r1"}},
    {"id": "r2", "action": "READ_FILE", "args": {"path": "C:/b.txt"}},
    {"id": "s2", "action": "STATE_APPEND", "args": {"key": "docs_buffer", "content": "$$r2"}}
  ]
}

CONDITIONAL EXAMPLES:

User: If the file 'status.txt' contains 'ERROR', delete it.
{
  "plan": [
    {"id": "r1", "action": "READ_FILE", "args": {"path": "./status.txt"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "Contains the word ERROR", "data": "$$r1"}},
    {"id": "d1", "action": "DELETE_FILE", "args": {"path": "./status.txt"}}
  ]
}

User: If the file exists, update it with "Hello"
{
  "plan": [
    {"id": "c1", "action": "CHECK_EXISTS", "args": {"path": "./file.txt"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The file exists", "data": "$$c1"}},
    {"id": "u1", "action": "UPDATE_FILE", "args": {"path": "./file.txt", "content": "Hello"}}
  ]
}

User: If there are any .txt files in ./docs, delete them
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./docs", "pattern": "\\\\.txt$"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The list is NOT empty", "data": "$$f1"}},
    {"id": "d1", "action": "DELETE_FILES", "args": {"files": "$$f1"}}
  ]
}

User input: ${userInput}
`;

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

  try {
    const cleanRaw = currentPlanRaw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanRaw) as PlanResponse;
    return parsed.plan || [];
  } catch (e) {
    if (debug) console.error("[ERROR] PLANNER PARSE FAILED:", e);
    return [];
  }
}

async function reflection(
  actionsText: string,
  userInput: string,
  currentPlanRaw: string,
  debug: boolean,
  basePrompt: string,
) {
  let attempts = 0;
  const MAX_ATTEMPTS = 3;
  let isReady = false;

  while (!isReady && attempts < MAX_ATTEMPTS) {
    const reflectionPrompt = `
    You are a deterministic QA optimizer for YI Agent.

    Your job is to VALIDATE and FIX the proposed plan.

    Available Actions:
    ${actionsText}

    USER_REQUEST: "${userInput}"
    PROPOSED_PLAN: ${currentPlanRaw}

    RULES:

    1. PERFECT PLAN:
    - Return ONLY: READY

    2. PLAN WITH ISSUES:
    - You MUST return a FULLY CORRECTED plan
    - Return ONLY valid JSON:
    {"plan": [...]}

    3. DO NOT RETURN:
    - Any explanations, text, markdown, or comments
    - Do NOT repeat the same plan if it is identical to the proposed plan

    VALIDATION CRITERIA:

    - ALL actions MUST exist in AVAILABLE ACTIONS
    - Replace invalid actions with valid equivalents
    - If the plan is identical to the proposed plan, return ONLY: READY
    - Fix missing or wrong arguments
    - Enforce correct DATA PIPING using "$$step_id"
    - Remove unnecessary steps
    - Enforce MINIMALISM

    CONDITIONAL RULES:

    - Use LOGIC_GATE for conditions
    - Pattern: [Action] → [LOGIC_GATE] → [DIRECT ACTION]
    - NEVER use AI_REPLAN for single actions

    REPLAN RULES:

    - Use AI_REPLAN ONLY for loops or multi-item processing
    - NEVER for single actions

    STATE RULES:

    - STATE_GET requires previous STATE_APPEND via REPLAN

    PATH RULES:

    - Paths must be valid full paths
    - NEVER use placeholders like "./contextData"

    STRICT OUTPUT FORMAT:

    - ONLY "READY" if the plan is already perfect
    - OR a valid JSON object with a "plan" array
    - DO NOT return the same plan multiple times; if identical, return READY
    `;

    const feedback = (await callOllama(
      reflectionPrompt,
      undefined,
      false,
    )) as string;

    console.log("FEEDBACK", feedback);
    console.log("current plan", currentPlanRaw.trim());

    function deepEqual(a: any, b: any): boolean {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((v, i) => deepEqual(v, b[i]));
      } else if (typeof a === "object" && a && b && typeof b === "object") {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every((k) => deepEqual(a[k], b[k]));
      }
      return a === b;
    }

    const isSamePlan = (planA: string, planB: string) => {
      try {
        const a = JSON.parse(planA).plan;
        const b = JSON.parse(planB).plan;

        console.log(a);
        return deepEqual(a, b);
      } catch {
        return false;
      }
    };

    console.log("is same plan", isSamePlan(currentPlanRaw, feedback));

    if (feedback.includes("READY") || isSamePlan(currentPlanRaw, feedback)) {
      isReady = true;
    } else {
      currentPlanRaw = feedback;
      attempts++;
    }

    if (feedback.includes("READY")) {
      isReady = true;
      if (debug)
        console.log(
          `\n[DEBUG] Plan verified as READY on attempt ${attempts + 1}`,
        );
    } else {
      attempts++;
      if (debug)
        console.log(
          `\n[DEBUG] Plan needs correction (Attempt ${attempts}): ${feedback}`,
        );

      // CORRECTION TO THE ORIGINAL PLAN
      const correctionPrompt = `
        ${basePrompt}

        ATTENTION: Your previous plan was INCOMPLETE or WRONG.
        PREVIOUS_PLAN: ${currentPlanRaw}
        CRITIC_FEEDBACK: ${feedback}

        INSTRUCTION: Generate a NEW, CORRECTED JSON plan.
        Address the feedback and ensure all steps and data piping are perfect.
      `;

      currentPlanRaw = (await callOllama(
        correctionPrompt,
        undefined,
        false,
      )) as string;
    }
  }
  return currentPlanRaw;
}
