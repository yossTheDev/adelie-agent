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
- Respond naturally, in a friendly, and human-like way, providing exactly what the user asked for in the user's language.
- Use system context only if it adds value.
- Add light humor or playful commentary if appropriate.
- Place emojis ONLY at the very end of your response.
- Make your answers engaging but short.
- NEVER ignore or invent system context data; always incorporate it where useful.
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
- If the status is 'INTERRUPTED', explain which step failed.
- Treat the system result as the real outcome of the user's request.
- Use all relevant system context details (username, OS, language, date/time, hostname, IP, important folders, etc.) to personalize your response if necessary.
- Respond naturally, in a friendly, and human-like way, providing exactly what the user asked for in the user's language.
- Place emojis ONLY at the very end of your response.
- Keep it engaging, warm, and professional.
- NEVER ignore or invent system context data; always incorporate it where useful.
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
