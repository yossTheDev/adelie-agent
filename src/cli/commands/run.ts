import { generatePlan } from "../../core/planner/planner.js";
import { runPlan } from "../../core/executor/executor.js";
import { generateResponse } from "../../core/response/response.js";
import type { ExecutionSummary } from "../../core/response/types.js";

export const runCommand = async (input: string) => {
  const planResult = await generatePlan(input);

  const execution = await runPlan(planResult);

  const executionSummary: ExecutionSummary = {
    total_steps: planResult.length,
    completed_steps: execution.length,
    status: "SUCCESS",
    details: execution,
  };

  const response = await generateResponse(executionSummary, input);

  console.log(response);
};
