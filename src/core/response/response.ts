import { ACTION_ARGS } from "../actions/actions.js";
import { readAgentConfig } from "../config/agent-config.js";
import { getSystemContextAsRules } from "../context/get-system-context.js";
import { callOllama } from "../llm/llm.js";
import { getMemoryStore } from "../memory/memory-store.js";
import type { ExecutionSummary } from "./types.js";

function buildActionsText(): string {
  const actionsInfo = Object.entries(ACTION_ARGS).map(([action, args]) => {
    const argsStr = args.length > 0 ? args.join(", ") : "no args";
    return `- ${action}: ${argsStr}`;
  });
  return actionsInfo.join("\n");
}

async function getRelevantMemoryContext(userInput: string): Promise<string> {
  try {
    const memoryStore = getMemoryStore();
    
    // Extract key terms from user input for memory search
    const terms = userInput.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .slice(0, 5); // Limit to prevent too many searches
    
    if (terms.length === 0) return "";
    
    // Search for relevant memory entries
    const relevantMemories: string[] = [];
    
    for (const term of terms) {
      try {
        const results = await memoryStore.search(term);
        // Take first 2 results for each term to avoid too much context
        const topResults = results.slice(0, 2);
        for (const result of topResults) {
          const memoryText = `- ${result.key}: ${JSON.stringify(result.value)}`;
          if (!relevantMemories.includes(memoryText)) {
            relevantMemories.push(memoryText);
          }
        }
      } catch {
        // Ignore search errors
      }
    }
    
    return relevantMemories.length > 0 
      ? `Relevant Memory Context:\n${relevantMemories.join('\n')}\n`
      : "";
  } catch (error) {
    // If memory retrieval fails, continue without memory context
    return "";
  }
}

function buildAskPrompt(
  userInput: string,
  systemRules: string,
  actionsText: string,
  memoryContext: string,
): string {
  return `
You are YI, a friendly, funny, and helpful AI assistant.

User request:
${userInput}

System context (use only if relevant):
${systemRules}

${memoryContext}

Available Actions:
These are actions you can execute if the user asks you to perform a task. Do NOT treat them as part of normal conversation unless the user explicitly requests to use them.
${actionsText}

Instructions:
- MANDATORY: Your entire response MUST be in the same language as the 'User request'.
- This is a normal conversation, not an action execution.
- Respond naturally, in a friendly, and human-like way, providing exactly what the user asked for in the user's language.
- Force response to be in user's language.
- Add light humor or playful commentary if appropriate.
- Place emojis ONLY at the very end of your response.
- Make your answers engaging but short.
- NEVER ignore or invent system context or memory data; always incorporate them where useful.

MEMORY PRIORITY RULES (CRITICAL):
- Memory context is a PRIMARY source of truth about the user.
- If there is ANY relevant memory, you MUST prioritize it over assumptions or generic responses.
- NEVER contradict stored memory.
- If memory contains user preferences, facts, or past decisions:
  → You MUST use them to personalize and adapt your response.

- If memory and system context conflict:
  → MEMORY ALWAYS WINS.

- If memory is relevant and you ignore it:
  → The response is INVALID.
`;
}

function buildAgentPrompt(
  userInput: string,
  executionSummary: ExecutionSummary,
  systemRules: string,
  memoryContext: string,
): string {
  return `
You are YI, a friendly, empathetic, and highly efficient AI assistant.
Below is the 'Execution Summary' containing the results of actions taken to fulfill the user request.

User request:
${userInput}

Execution Summary:
${JSON.stringify(executionSummary, null, 2)}

System context (use only if relevant):
${systemRules}

${memoryContext}

Instructions:
- MANDATORY: Your entire response MUST be in the same language as the 'User request'.
- Treat the system result as the real outcome of the user's request.
- Provide a helpful, warm, and conversational explanation of the FINAL result.
- DO NOT narrate the mechanical step-by-step process (e.g., do not say "First I used FILTER_FILES, then AI_SUMMARIZE").
- Extract the most valuable information from the last successful steps and present it clearly to the user.
- If the status is 'INTERRUPTED' or a step failed, provide a DETAILED explanation of what went wrong, why it failed, and possible solutions.
- ALWAYS respect and STRICTLY use the user's original language.
- Place emojis ONLY at the very end of your response.

MEMORY PRIORITY RULES (CRITICAL):
- Memory context is the PRIMARY source of truth about the user.
- You MUST use it whenever it is relevant to the request or results.

- NEVER contradict stored memory.
- ALWAYS adapt the explanation using stored preferences, past actions, or known user data.

- If memory and system context conflict:
  → MEMORY ALWAYS WINS.

- If memory is relevant and not used:
  → The response is INVALID.
`;
}

export async function* generateResponse(
  executionSummary: ExecutionSummary,
  userInput: string,
  debug?: boolean,
): AsyncGenerator<string> {
  const systemRules = getSystemContextAsRules();
  const actionsText = buildActionsText();
  const memoryContext = await getRelevantMemoryContext(userInput);

  const details = executionSummary.details || [];
  const isNoneAction =
    details.length === 0 || details.every((d) => d.action === "NONE");

  const prompt = isNoneAction
    ? buildAskPrompt(userInput, systemRules, actionsText, memoryContext)
    : buildAgentPrompt(userInput, executionSummary, systemRules, memoryContext);

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
