import { MODEL } from "../config.js";
import { getSystemContextAsRules } from "../context/get-system-context.js";
import { callOllama } from "../llm/llm.js";
import type { ExecutionSummary } from "./types.js";

export async function* generateResponse(
  executionSummary: ExecutionSummary,
  userInput: string,
  debug?: boolean,
): AsyncGenerator<string> {
  const systemRules = getSystemContextAsRules();

  const details = executionSummary.details || [];
  const isNoneAction =
    details.length === 0 || details.every((d) => d.action === "NONE");

  let prompt = "";

  if (isNoneAction) {
    prompt = `
You are YI, a friendly, funny, and helpful AI assistant.

User said:
${userInput}

System context (use only if relevant):
${systemRules}

Instructions:
- This is a normal conversation, not an action execution.
- Respond naturally, friendly, human-like.
- Add light humor if appropriate.
- Place emojis ONLY at the end.
`;
  } else {
    prompt = `
You are YI, a friendly and reliable AI assistant.
The 'Execution Summary' below contains the results of the multi-step plan executed for the user.

User said:
${userInput}

Execution Summary:
${JSON.stringify(executionSummary, null, 2)}

System context (use only if relevant):
${systemRules}

Instructions:
- Use the 'Execution Summary' to explain what was done.
- Respond naturally, friendly, human-like.
- Place emojis ONLY at the end.
`;
  }

  if (debug) {
    console.log("\n[DEBUG] RESPONSE PROMPT:");
    console.log(prompt);
  }

  const stream = await callOllama(prompt, MODEL, true);

  for await (const chunk of stream as AsyncGenerator<string>) {
    yield chunk;
  }
}
