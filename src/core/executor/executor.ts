import { ACTIONS } from "../actions/actions.js";

interface Intent {
  id: string;
  action: string;
  args?: Record<string, any>;
}

interface ExecutionResult {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
  action: string;
  args: Record<string, any>;
}

/**
 * Global execution context for the current plan session.
 * Stores results indexed by step ID for data piping ($$).
 */
const executionContext: Record<string, any> = {};

/**
 * Resolves arguments by replacing "$$id" references with actual values
 * from previous steps stored in the executionContext.
 */
const resolveArguments = (args: Record<string, any>): Record<string, any> => {
  const resolved = { ...args };

  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string" && value.startsWith("$$")) {
      const refId = value.substring(2); // Remove "$$" prefix
      // Inject the previous result if it exists in the context
      if (refId in executionContext) {
        resolved[key] = executionContext[refId];
      }
    }
  }

  return resolved;
};

/**
 * Core function to execute a single action.
 */
export const executeAction = async (
  intent: Intent,
  debug: boolean = false,
): Promise<ExecutionResult> => {
  if (debug)
    console.log(`\n[DEBUG] EXECUTING ACTION [${intent.id}]:`, intent.action);

  const action = intent.action;
  const rawArgs = intent.args || {};

  // Step 1: Deterministic Argument Resolution
  const resolvedArgs = resolveArguments(rawArgs);

  if (debug && JSON.stringify(rawArgs) !== JSON.stringify(resolvedArgs)) {
    console.log("[DEBUG] RESOLVED ARGS:", resolvedArgs);
  }

  // Handle Unknown or Empty Actions
  if (action === "UNKNOWN" || action === "NONE") {
    return {
      id: intent.id,
      success: true,
      result: null,
      action: "NONE",
      args: resolvedArgs,
    };
  }

  // Verify if action is implemented
  if (!(action in ACTIONS)) {
    return {
      id: intent.id,
      success: false,
      error: `Action '${action}' not implemented in YI Core.`,
      action: action,
      args: resolvedArgs,
    };
  }

  try {
    // Step 2: Pure Function Execution
    const [success, result] = await ACTIONS[action](resolvedArgs);

    // Step 3: Save result to context for potential data piping in future steps
    if (success) {
      executionContext[intent.id] = result;
    }

    const executionResult: ExecutionResult = {
      id: intent.id,
      success,
      result,
      action,
      args: resolvedArgs,
    };

    if (debug)
      console.log("[DEBUG] EXECUTION RESULT:", success ? "SUCCESS" : "FAILED");

    return executionResult;
  } catch (error) {
    return {
      id: intent.id,
      success: false,
      error: String(error),
      action,
      args: resolvedArgs,
    };
  }
};

/**
 * Orchestrator: Runs the full plan sequence and manages dynamic step injection.
 * If an action returns a new set of steps (AI_REPLAN), they are injected into the queue.
 */
export const runPlan = async (
  initialPlan: Intent[],
  debug: boolean = false,
): Promise<ExecutionResult[]> => {
  const fullHistory: ExecutionResult[] = [];
  const currentQueue = [...initialPlan]; // Dynamic copy of the plan queue

  let i = 0;
  while (i < currentQueue.length) {
    const step = currentQueue[i];
    const result = await executeAction(step, debug);
    fullHistory.push(result);

    // Step Injection Logic: AI_REPLAN can add new steps to the currentQueue
    if (step.action === "AI_REPLAN" && result.success) {
      try {
        // Parse the result as a new list of Intent steps
        const newSteps =
          typeof result.result === "string"
            ? JSON.parse(result.result)
            : result.result;

        if (Array.isArray(newSteps) && newSteps.length > 0) {
          if (debug)
            console.log(
              `[DEBUG] AI_REPLAN: Injecting ${newSteps.length} new steps.`,
            );
          // Inject new steps right after the current position
          currentQueue.splice(i + 1, 0, ...newSteps);
        }
      } catch (e) {
        if (debug)
          console.log("[DEBUG] AI_REPLAN: Result was not a valid step array.");
      }
    }

    // Halt execution if a mandatory step fails
    if (!result.success) {
      if (debug)
        console.error(
          `[FATAL] Stopping plan at step ${step.id} due to failure.`,
        );
      break;
    }

    i++;
  }

  return fullHistory;
};

/**
 * Helper to clear the context between different user requests
 * to avoid data leakage between sessions.
 */
export const resetExecutionContext = () => {
  for (const key in executionContext) delete executionContext[key];
};
