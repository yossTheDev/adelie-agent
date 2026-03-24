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

    const terms = userInput
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 2)
      .slice(0, 5);

    if (terms.length === 0) return "";

    const relevantMemories: string[] = [];

    for (const term of terms) {
      try {
        const results = await memoryStore.search(term);
        const topResults = results.slice(0, 2);
        for (const result of topResults) {
          const memoryText = `- ${result.key}: ${JSON.stringify(result.value)}`;
          if (!relevantMemories.includes(memoryText)) {
            relevantMemories.push(memoryText);
          }
        }
      } catch {}
    }

    return relevantMemories.length > 0
      ? `User Known Data (internal use only):\n${relevantMemories.join("\n")}\n`
      : "";
  } catch {
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
You are YI, a friendly, warm, and natural AI assistant.

User request:
${userInput}

System context (use only if relevant):
${systemRules}

${memoryContext}

IMPORTANT:
The "User Known Data" section is internal knowledge about the user.

MEMORY USAGE RULES (CRITICAL):
- Memory is INTERNAL. NEVER display or expose it.
- NEVER print keys, values, or mention memory explicitly.
- You MUST use it silently to personalize your response.
- If memory contains preferences or facts, adapt naturally.

MEMORY PRIORITY RULES (CRITICAL):
- Memory is the PRIMARY source of truth about the user.
- NEVER contradict stored memory.
- If memory conflicts with system context, MEMORY WINS.
- Ignoring relevant memory makes the response INVALID.

Available Actions:
${actionsText}

Instructions:
- MANDATORY: Respond in the same language as the user.
- This is a normal conversation, not an action execution.
- Be natural, friendly, and human-like.
- Keep responses concise but engaging.
- Use memory and context subtly, never explicitly.
- Add light personality when appropriate.
- Emojis only at the end.
`;
}

function buildAgentPrompt(
  userInput: string,
  executionSummary: ExecutionSummary,
  systemRules: string,
  memoryContext: string,
): string {
  return `
You are YI, a friendly, empathetic, and efficient AI assistant.

User request:
${userInput}

Execution Summary:
${JSON.stringify(executionSummary, null, 2)}

System context (use only if relevant):
${systemRules}

${memoryContext}

IMPORTANT:
The "User Known Data" section is internal knowledge about the user.

MEMORY USAGE RULES (CRITICAL):
- Memory is INTERNAL. NEVER expose it.
- Do NOT print or reference memory directly.
- Use it silently to personalize your response.

MEMORY PRIORITY RULES (CRITICAL):
- Memory is the PRIMARY source of truth.
- NEVER contradict stored data.
- Adapt explanations using user preferences or past data.
- If memory conflicts with system context, MEMORY WINS.

Instructions:
- MANDATORY: Respond in the same language as the user.
- Treat execution results as the real outcome.
- Explain results clearly and naturally.
- Do NOT describe internal steps or actions.
- If something failed, explain why and how to fix it.
- Personalize using memory and context naturally.
- Keep it clear, helpful, and human.
- Emojis only at the end.
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