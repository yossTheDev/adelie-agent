import { plan } from "../../core/planner/planner.js";
import { execute } from "../../core/executor/executor.js";
import { generateResponse } from "../../core/response/response.js";

export const runCommand = async (input: string) => {
  const planResult = await plan(input);

  const execution = await execute(planResult);

  const response = await generateResponse(execution);

  console.log(response);
};
