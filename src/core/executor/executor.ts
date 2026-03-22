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
  const resolvedArgs = resolveArguments(rawArgs);

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
    const items = resolvedArgs.items || [];
    const template: Intent[] = resolvedArgs.template || [];
    for (const item of items) {
      for (const t of template) {
        const cloned: Intent = {
          ...t,
          args: { ...t.args, item },
          id: `${intent.id}_${t.id}_${item}`,
        };
        await executeAction(cloned, debug);
      }
    }
    return { id: intent.id, success: true, action, args: resolvedArgs };
  }

  if (action === "IF") {
    const condition = resolvedArgs.condition;
    const thenSteps: Intent[] = resolvedArgs.then || [];
    const elseSteps: Intent[] = resolvedArgs.else || [];
    const conditionMet = executionContext[condition] ?? false;
    const selectedSteps = conditionMet ? thenSteps : elseSteps;
    for (const s of selectedSteps) await executeAction(s, debug);
    return { id: intent.id, success: true, action, args: resolvedArgs };
  }

  if (action === "WHILE") {
    const conditionKey = resolvedArgs.condition;
    const body: Intent[] = resolvedArgs.body || [];
    let loopCounter = 0;
    while (executionContext[conditionKey] ?? false) {
      for (const b of body) {
        const cloned: Intent = {
          ...b,
          id: `${intent.id}_loop${loopCounter}_${b.id}`,
        };
        await executeAction(cloned, debug);
      }
      loopCounter++;
      if (loopCounter > 1000) break;
    }
    return { id: intent.id, success: true, action, args: resolvedArgs };
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
        lastGateResult = Boolean(result.result);
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
