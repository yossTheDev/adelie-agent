import { ACTIONS } from "../actions/actions.js";

interface Intent {
  action: string;
  args?: Record<string, any>;
}

interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  action: string;
  args: Record<string, any>;
}

export const executeAction = async (
  intent: Intent,
  debug: boolean = false,
): Promise<ExecutionResult> => {
  if (debug) console.log("\n[DEBUG] EXECUTING ACTION:", intent);

  const action = intent.action;
  const args = intent.args || {};

  if (action === "UNKNOWN") {
    const executionResult: ExecutionResult = {
      success: true,
      result: null,
      action: "NONE",
      args: {},
    };
    if (debug) console.log("[DEBUG] EXECUTION RESULT:", executionResult);
    return executionResult;
  }

  if (!(action in ACTIONS)) {
    const executionResult: ExecutionResult = {
      success: false,
      error: "Action not implemented",
      action: action,
      args,
    };
    if (debug) console.log("[DEBUG] EXECUTION RESULT:", executionResult);
    return executionResult;
  }

  const [success, result] = await ACTIONS[action](args);

  const executionResult: ExecutionResult = {
    success,
    result,
    action,
    args,
  };

  if (debug) console.log("[DEBUG] EXECUTION RESULT:", executionResult);

  return executionResult;
};
