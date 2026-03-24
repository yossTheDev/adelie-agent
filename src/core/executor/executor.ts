import { ACTIONS } from "../actions/actions.js";
import { readAgentConfig } from "../config/agent-config.js";

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

const toBoolean = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off", ""].includes(normalized)) return false;
  }
  return Boolean(value);
};

const parseLoopItems = (itemsInput: any): any[] => {
  if (Array.isArray(itemsInput)) return itemsInput;

  if (typeof itemsInput === "string") {
    const trimmed = itemsInput.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore and fallback to CSV
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
};

const normalizeTemplate = (templateInput: any): Intent[] => {
  if (Array.isArray(templateInput)) return templateInput;
  if (templateInput && typeof templateInput === "object") return [templateInput];
  return [];
};

const parseLogicExpression = (
  input: string,
): { gate: string; values: string[] } | null => {
  const trimmed = input.trim();
  const match = /^([A-Za-z_]+)\((.*)\)$/.exec(trimmed);
  if (!match) return null;
  const gate = match[1].toUpperCase();
  const values = match[2]
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return { gate, values };
};

const resolveConditionValue = async (
  conditionInput: any,
  localScope: Record<string, any>,
): Promise<boolean> => {
  if (
    typeof conditionInput === "object" &&
    conditionInput !== null &&
    "action" in conditionInput
  ) {
    const actionName = String((conditionInput as any).action || "").toUpperCase();
    const actionArgs = resolveArguments((conditionInput as any).args || {}, localScope);

    if (actionName in ACTIONS) {
      const [ok, result] = await ACTIONS[actionName](actionArgs);
      return ok ? toBoolean(result) : false;
    }
  }

  if (
    typeof conditionInput === "object" &&
    conditionInput !== null &&
    "gate" in conditionInput
  ) {
    const gateName = String((conditionInput as any).gate || "").toUpperCase();
    const gateArgs = { ...conditionInput };
    delete (gateArgs as any).gate;
    const resolvedGateArgs = resolveArguments(gateArgs, localScope);

    if (gateName in ACTIONS) {
      const [ok, result] = await ACTIONS[gateName](resolvedGateArgs);
      return ok ? toBoolean(result) : false;
    }
  }

  if (typeof conditionInput === "string" && conditionInput in localScope) {
    return toBoolean(localScope[conditionInput]);
  }

  if (typeof conditionInput === "string" && conditionInput in executionContext) {
    return toBoolean(executionContext[conditionInput]);
  }

  if (typeof conditionInput === "string" && conditionInput.startsWith("$$")) {
    return toBoolean(resolveArguments(conditionInput, localScope));
  }

  if (typeof conditionInput === "string") {
    const parsed = parseLogicExpression(conditionInput);
    if (parsed && parsed.gate in ACTIONS) {
      const resolvedValues = parsed.values.map((value) =>
        resolveArguments(value, localScope),
      );

      if (resolvedValues.length >= 2) {
        const [ok, result] = await ACTIONS[parsed.gate]({
          a: resolvedValues[0],
          b: resolvedValues[1],
        });
        return ok ? toBoolean(result) : false;
      }

      if (resolvedValues.length === 1) {
        const [ok, result] = await ACTIONS[parsed.gate]({
          value: resolvedValues[0],
        });
        return ok ? toBoolean(result) : false;
      }
    }
  }

  return toBoolean(resolveArguments(conditionInput, localScope));
};

/**
 * Resolves arguments by replacing "$$id" references with actual values
 * from previous steps stored in the executionContext.
 */
const resolveArguments = (
  args: any,
  localScope: Record<string, any> = {},
): any => {
  if (typeof args === "string") {
    if (args.startsWith("$$")) {
      const refId = args.substring(2);
      if (refId in localScope) return localScope[refId];
      return executionContext[refId] ?? args;
    }

    return args.replace(/\$\$([A-Za-z0-9_-]+)/g, (match, refId) => {
      if (refId in localScope) return String(localScope[refId]);
      if (refId in executionContext) return String(executionContext[refId]);
      return match;
    });
  }

  if (Array.isArray(args)) {
    return args.map((item) => resolveArguments(item, localScope));
  }

  if (typeof args === "object" && args !== null) {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      resolved[key] = resolveArguments(value, localScope);
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
  localScope: Record<string, any> = {},
): Promise<ExecutionResult> => {
  if (debug)
    console.log(`\n[DEBUG] EXECUTING ACTION [${intent.id}]:`, intent.action);

  const action = intent.action;
  const rawArgs = intent.args || {};
  const resolvedArgs = resolveArguments(rawArgs, localScope);

  if (debug && JSON.stringify(rawArgs) !== JSON.stringify(resolvedArgs)) {
    console.log("[DEBUG] RESOLVED ARGS:", resolvedArgs);
  }

  if (action === "UNKNOWN" || action === "NONE") {
    return {
      id: intent.id,
      success: true,
      result: null,
      action: "NONE",
      args: resolvedArgs,
    };
  }

  if (action === "FOR_EACH") {
    const items = parseLoopItems(resolvedArgs.items);
    const template: Intent[] = normalizeTemplate(resolvedArgs.template);

    if (template.length === 0) {
      return {
        id: intent.id,
        success: false,
        error: "FOR_EACH requires a valid template",
        action,
        args: resolvedArgs,
      };
    }

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const iterationScope: Record<string, any> = { ...localScope, item, index };
      
      for (const t of template) {
        const resolvedTemplateId = resolveArguments(t.id, iterationScope);
        const resolvedTemplateArgs = resolveArguments(t.args || {}, iterationScope);
        const cloned: Intent = {
          ...t,
          args: resolvedTemplateArgs,
          id: `${intent.id}_${String(resolvedTemplateId)}_${index}`,
        };
        const nestedResult = await executeAction(cloned, debug, iterationScope);
        
        // Store the result in iteration scope for next steps in same iteration
        iterationScope[t.id] = nestedResult.result;
        
        if (!nestedResult.success) {
          return {
            id: intent.id,
            success: false,
            error: `FOR_EACH failed at item '${String(item)}' on step '${cloned.id}': ${nestedResult.error || nestedResult.result || "unknown error"}`,
            action,
            args: resolvedArgs,
          };
        }
      }
    }
    executionContext[intent.id] = true;
    return {
      id: intent.id,
      success: true,
      result: true,
      action,
      args: resolvedArgs,
    };
  }

  if (action === "IF") {
    const condition = resolvedArgs.condition;
    const thenSteps: Intent[] = resolvedArgs.then || [];
    const elseSteps: Intent[] = resolvedArgs.else || [];
    let conditionMet = await resolveConditionValue(condition, localScope);

    if (
      typeof condition === "string" &&
      !condition.startsWith("$$") &&
      !(condition in localScope) &&
      !(condition in executionContext) &&
      "data" in resolvedArgs
    ) {
      const [ok, result] = await ACTIONS.LOGIC_GATE({
        condition,
        data: resolvedArgs.data,
      });
      if (ok) conditionMet = toBoolean(result);
    }

    const selectedSteps = conditionMet ? thenSteps : elseSteps;
    for (let stepIndex = 0; stepIndex < selectedSteps.length; stepIndex++) {
      const s = selectedSteps[stepIndex];
      const cloned: Intent = { ...s, id: `${intent.id}_${stepIndex}_${s.id}` };
      const nestedResult = await executeAction(cloned, debug, localScope);
      if (!nestedResult.success) {
        return {
          id: intent.id,
          success: false,
          error: `IF branch step failed at '${cloned.id}': ${nestedResult.error || nestedResult.result || "unknown error"}`,
          action,
          args: resolvedArgs,
        };
      }
    }
    executionContext[intent.id] = conditionMet;
    return {
      id: intent.id,
      success: true,
      result: conditionMet,
      action,
      args: resolvedArgs,
    };
  }

  if (action === "WHILE") {
    const config = readAgentConfig();
    const maxIterations = Math.max(1, Number(config.max_loop_iterations || 1000));
    const conditionInput = resolvedArgs.condition;
    const body: Intent[] = resolvedArgs.body || [];
    let loopCounter = 0;
    while (true) {
      const conditionMet = await resolveConditionValue(conditionInput, localScope);

      if (!conditionMet) break;

      for (let bodyIndex = 0; bodyIndex < body.length; bodyIndex++) {
        const b = body[bodyIndex];
        const cloned: Intent = {
          ...b,
          id: `${intent.id}_loop${loopCounter}_${bodyIndex}_${b.id}`,
        };
        const nestedResult = await executeAction(cloned, debug, {
          ...localScope,
          loopCounter,
        });
        if (!nestedResult.success) {
          return {
            id: intent.id,
            success: false,
            error: `WHILE body step failed at '${cloned.id}': ${nestedResult.error || nestedResult.result || "unknown error"}`,
            action,
            args: resolvedArgs,
          };
        }
      }
      loopCounter++;
      if (loopCounter > maxIterations) break;
    }
    executionContext[intent.id] = true;
    return {
      id: intent.id,
      success: true,
      result: true,
      action,
      args: resolvedArgs,
    };
  }

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
    const [success, result] = await ACTIONS[action](resolvedArgs);
    if (success) executionContext[intent.id] = result;
    return { id: intent.id, success, result, action, args: resolvedArgs };
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

let lastGateResult: boolean | null = null;
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

    if (lastGateResult === false) {
      if (debug)
        console.log(
          `[DEBUG] Skipping step [${step.id}] due to previous LOGIC_GATE = false`,
        );

      lastGateResult = null;
      i++;
      continue;
    }

    if (onStep) onStep(i, currentQueue.length, step);

    try {
      const result = await executeAction(step, debug);

      if (step.action === "LOGIC_GATE") {
        lastGateResult = toBoolean(result.result);
      } else {
        lastGateResult = null;
      }

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
