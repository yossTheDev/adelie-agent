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
 * Stores results indexed by step ID.
 */
const executionContext: Record<string, any> = {};

/**
 * Resolves arguments by replacing "$$id" references with actual values
 * from previous steps in the executionContext.
 */
const resolveArguments = (args: Record<string, any>): Record<string, any> => {
  const resolved = { ...args };

  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string" && value.startsWith("$$")) {
      const refId = value.substring(2); // Remove "$$"
      // Inject the previous result if it exists, otherwise leave as is
      if (refId in executionContext) {
        resolved[key] = executionContext[refId];
      }
    }
  }

  return resolved;
};

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

  // Handle Unknown Action
  if (action === "UNKNOWN" || action === "NONE") {
    return {
      id: intent.id,
      success: true,
      result: null,
      action: "NONE",
      args: resolvedArgs,
    };
  }

  // Check if Action exists
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
    // Step 2: Pure Execution
    const [success, result] = await ACTIONS[action](resolvedArgs);

    // Step 3: Save result to context for potential future steps ($$)
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
 * Helper to clear the context between different user requests
 */
export const resetExecutionContext = () => {
  for (const key in executionContext) delete executionContext[key];
};
