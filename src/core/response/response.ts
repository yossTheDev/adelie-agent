import { ACTION_ARGS } from "../actions/actions.js";
import { readAgentConfig } from "../config/agent-config.js";
import { getSystemContextAsRules } from "../context/get-system-context.js";
import { callOllama } from "../llm/llm.js";
import type { ExecutionSummary } from "./types.js";

function buildActionsText(): string {
  const actionsInfo = Object.entries(ACTION_ARGS).map(([action, args]) => {
    const argsStr = args.length > 0 ? args.join(", ") : "no args";
    return `- ${action}: ${argsStr}`;
  });
  return actionsInfo.join("\n");
}

function buildAskPrompt(
  userInput: string,
  systemRules: string,
  actionsText: string,
): string {
  return `
You are YI, a friendly, funny, and helpful AI assistant.

User request:
${userInput}

System context (use only if relevant):
${systemRules}

Available Actions:
These are the actions you can execute if the user asks you to perform a task. Do NOT treat them as part of normal conversation unless the user explicitly requests to use them.
${actionsText}

Instructions:
- MANDATORY: Your entire response MUST be in the same language as the 'User request'.
- This is a normal conversation, not an action execution.
- Respond naturally, in a friendly, and human-like way, providing exactly what the user asked for in the user's language.
- Use system context only if it adds value.
- Force the response to be in the user's language.
- Add light humor or playful commentary if appropriate.
- Place emojis ONLY at the very end of your response.
- Make your answers engaging but short.
- NEVER ignore or invent system context data; always incorporate it where useful.
`;
}

function buildAgentPrompt(
  userInput: string,
  executionSummary: ExecutionSummary,
  systemRules: string,
): string {
  return `
You are YI, a friendly, empathetic, and highly efficient AI assistant.
Below is the 'Execution Summary' containing the results of the actions taken to fulfill the user request.

User request:
${userInput}

Execution Summary:
${JSON.stringify(executionSummary, null, 2)}

System context (use only if relevant):
${systemRules}

Instructions:
- MANDATORY: Your entire response MUST be in the same language as the 'User request'.
- Treat the system result as the real outcome of the user's request.
- Provide a helpful, warm, and conversational explanation of the FINAL result.
- DO NOT narrate the mechanical step-by-step process (e.g., do not say "First I used FILTER_FILES, then AI_SUMMARIZE").
- Extract the most valuable information from the last successful steps and present it clearly to the user.
- If the status is 'INTERRUPTED' or a step failed, provide a DETAILED explanation of what went wrong, why it failed, and possible solutions.
- ALWAYS respect and STRICTLY use the user's original language.
- Use relevant system context details (username, OS, time, etc.) to naturally personalize your response.
- Place emojis ONLY at the very end of your response.
`;
}

export async function* generateResponse(
  executionSummary: ExecutionSummary,
  userInput: string,
  debug?: boolean,
): AsyncGenerator<string> {
  const systemRules = getSystemContextAsRules();
  const actionsText = buildActionsText();

  const details = executionSummary.details || [];
  const isNoneAction =
    details.length === 0 || details.every((d) => d.action === "NONE");

  const prompt = isNoneAction
    ? buildAskPrompt(userInput, systemRules, actionsText)
    : buildAgentPrompt(userInput, executionSummary, systemRules);

  if (debug) {
    console.log("\n[DEBUG] RESPONSE PROMPT:");
    console.log(prompt);
  }

  const config = readAgentConfig();
  const stream = await callOllama(prompt, config.model, true);

  for await (const chunk of stream as AsyncGenerator<string>) {
    yield chunk;
  }
}
