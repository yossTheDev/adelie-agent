import { callOllama } from "../llm/llm.js";

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
