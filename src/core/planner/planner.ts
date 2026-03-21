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
7. WORKER RULE: If the input ALREADY contains a list of items and a goal (e.g., "CONTEXT: ... DATA FOUND: ..."), DO NOT return AI_REPLAN. Generate ATOMIC steps for EACH item.
8. INFORMATION ACCUMULATION:
   - When you need to process MULTIPLE items and then give a SINGLE final result (like summarizing several files), use the "Buffer Pattern".
   - Step A: AI_REPLAN to generate steps that use STATE_APPEND for each item.
   - Step B: Use STATE_GET to retrieve the combined string.
   - Step C: Use AI_TRANSFORM or AI_SUMMARIZE on the combined string.
9. NO EXPLANATIONS, NO MARKDOWN, NO CONVERSATION.
10. CONDITIONAL BRANCHING (IF/THEN):
    - When the user says "If X exists" or "If X contains", you MUST use LOGIC_GATE.
    - Path: [Action to find data] -> [LOGIC_GATE to evaluate data] -> [AI_REPLAN based on TRUE/FALSE].
    - NEVER jump directly to AI_REPLAN if a condition can be evaluated by LOGIC_GATE first.

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
    {"id": "gate1", "action": "LOGIC_GATE", "args": {"condition": "Contains the word ERROR", "data": "$$r1"}},
    {
      "id": "decision",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "If contextData is 'TRUE', delete ./status.txt. If 'FALSE', do nothing and stop.",
        "contextData": "$$gate1"
      }
    }
  ]
}

User: If there is any file starting with 'bye' in C:/Docs, create 'hello.txt' there.
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "C:/Docs", "pattern": "^bye"}},
    {
      "id": "check1",
      "action": "LOGIC_GATE",
      "args": {
        "condition": "The list of files is NOT empty",
        "data": "$$f1"
      }
    },
    {
      "id": "decide",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "If contextData is 'TRUE', create a file named 'hello.txt' in C:/Docs. If 'FALSE', do nothing.",
        "contextData": "$$check1"
      }
    }
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

  console.log(currentPlanRaw);

  // --- PHASE 2: REFLECTION LOOP ---
  let attempts = 0;
  const MAX_ATTEMPTS = 3;
  let isReady = false;

  while (!isReady && attempts < MAX_ATTEMPTS) {
    const reflectionPrompt = `
        As a Quality Assurance expert, analyze this plan for CORRECTNESS and MINIMALISM.

        ${basePrompt}

        USER_REQUEST: "${userInput}"
        PROPOSED_PLAN: ${currentPlanRaw}

        CRITERIA:
        1. COMPLETENESS: Does it fulfill 100% of the goal?
        2. DATA PIPING: Is every "$$step_id" referencing a real previous step?
        3. AI_REPLAN IS MANDATORY when you have a list of items (from FILTER_FILES or LIST_DIR) and you need to perform actions on EACH ONE (like READ_FILE + STATE_APPEND).
        4. STATE_GET REQUIRES PREVIOUS APPENDS: A plan is INVALID if it uses STATE_GET without a previous loop (AI_REPLAN) that fills that buffer using STATE_APPEND.
        5. MINIMALISM (CRITICAL): Does the plan contain UNNECESSARY steps?
           - If the user didn't ask to read a file, don't read it.
           - If a bulk action (like DELETE_FILES) can do it in one step, don't use AI_REPLAN.
           - Remove any step that doesn't directly contribute to the final goal.
        6. CONDITIONAL CHECK: If the request contains "If", "When", or "In case", the plan MUST include a LOGIC_GATE. Reject any plan that skips the evaluation step.
        7. ACCUMULATION: If multiple items need a single summary, are STATE_APPEND and STATE_GET used correctly?
        8. NO INVENTIONS: If an action or argument is not in the AVAILABLE ACTIONS list, the plan is INVALID.

        RESPONSE:
        - If the plan is PERFECT and MINIMAL, return "READY".
        - If not, explain ONLY what is missing, wrong, or SUPERFLUOUS (extra).
      `;

    const feedback = (await callOllama(
      reflectionPrompt,
      undefined,
      false,
    )) as string;

    console.log("FEEDBACK", feedback);

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
