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
  onStep?: (
    index: number,
    total: number,
    step: Intent,
    result?: ExecutionResult,
    error?: any,
  ) => void,
): Promise<ExecutionResult[]> => {
  const fullHistory: ExecutionResult[] = [];
  const currentQueue = [...initialPlan];

  let i = 0;
  while (i < currentQueue.length) {
    const step = currentQueue[i];

    // Notify UI that a step is starting
    if (onStep) onStep(i, currentQueue.length, step);

    try {
      const result = await executeAction(step, debug);
      fullHistory.push(result);

      // Notify UI that a step finished
      if (onStep) onStep(i, currentQueue.length, step, result);

      if (!result.success) break;

      // Handle Step Injection
      if (step.action === "AI_REPLAN") {
        const rawData =
          typeof result.result === "string"
            ? JSON.parse(result.result)
            : result.result;
        const newSteps = Array.isArray(rawData) ? rawData : rawData?.plan;

        if (Array.isArray(newSteps) && newSteps.length > 0) {
          currentQueue.splice(i + 1, 0, ...newSteps);
        }
      }
    } catch (e) {
      if (onStep) onStep(i, currentQueue.length, step, undefined, e);
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
