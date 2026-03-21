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
const resolveArguments = (args: any): any => {
  if (typeof args === "string") {
    if (args.startsWith("$$")) {
      const refId = args.substring(2);
      return executionContext[refId] ?? args;
    }
    return args;
  }

  if (Array.isArray(args)) {
    return args.map(resolveArguments);
  }

  if (typeof args === "object" && args !== null) {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      resolved[key] = resolveArguments(value);
    }
    return resolved;
  }

  return args;
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

  console.log(action);
  console.log("resolvedArgs context");
  console.log(resolvedArgs);

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

    if (onStep) onStep(i, currentQueue.length, step);

    try {
      const result = await executeAction(step, debug);
      fullHistory.push(result);

      if (onStep) onStep(i, currentQueue.length, step, result);

      if (!result.success) break;

      if (
        step.action === "AI_REPLAN" ||
        (result.result && result.result.plan)
      ) {
        let newSteps: Intent[] = [];

        try {
          const rawData =
            typeof result.result === "string"
              ? JSON.parse(result.result)
              : result.result;

          newSteps = Array.isArray(rawData) ? rawData : rawData?.plan;
        } catch (e) {
          if (debug) console.error("[ERROR] Failed to parse REPLAN steps:", e);
        }

        if (Array.isArray(newSteps) && newSteps.length > 0) {
          const prefix = `${step.id}_`;

          const remapArgs = (args: any): any => {
            if (typeof args === "string" && args.startsWith("$$")) {
              const ref = args.substring(2);
              return `$$${prefix}${ref}`;
            }

            if (Array.isArray(args)) {
              return args.map(remapArgs);
            }

            if (typeof args === "object" && args !== null) {
              const obj: Record<string, any> = {};
              for (const key in args) {
                obj[key] = remapArgs(args[key]);
              }
              return obj;
            }

            return args;
          };

          const remappedSteps = newSteps.map((s) => ({
            ...s,
            id: prefix + s.id,
            args: remapArgs(s.args),
          }));

          if (debug)
            console.log(
              `[DEBUG] Injecting ${remappedSteps.length} namespaced steps into the queue.`,
            );

          currentQueue.splice(i + 1, 0, ...remappedSteps);
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
