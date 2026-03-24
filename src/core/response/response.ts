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

let loadedMemory: string = "";

const loadAllMemory = async (): Promise<void> => {
  try {
    const memoryStore = getMemoryStore();
    const allMemory = await memoryStore.list();
    
    if (allMemory.length === 0) {
      loadedMemory = "";
      return;
    }

    const memoryTexts: string[] = [];
    for (const entry of allMemory) {
      const value = await memoryStore.get(entry.key);
      memoryTexts.push(`- ${entry.key}: ${JSON.stringify(value)}`);
    }

    loadedMemory = memoryTexts.length > 0
      ? `User Known Data:\n${memoryTexts.join("\n")}\n`
      : "";
  } catch {
    loadedMemory = "";
  }
};

function getRelevantMemoryContext(userInput: string): string {
  return loadedMemory;
}

function buildAskPrompt(
  userInput: string,
  systemRules: string,
  actionsText: string,
  memoryContext: string,
): string {
  return `
You are Adelie, a friendly, warm, and natural AI assistant.

User request:
${userInput}

System context (use only if relevant):
${systemRules}

${memoryContext}

IMPORTANT:
The "User Known Data" section contains information about the user that you MUST use to personalize your response.

MEMORY USAGE RULES (CRITICAL):
- You MUST use memory to personalize and adapt your response.
- Reference the information naturally without mentioning "memory" or showing keys.
- If memory contains preferences, facts, or past interactions, incorporate them.
- Use memory to provide more relevant and personalized answers.
- NEVER ignore relevant memory information.

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
- Use memory and context ACTIVELY to personalize responses.
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
You are Adelie, a friendly, empathetic, and efficient AI assistant.

User request:
${userInput}

Execution Summary:
${JSON.stringify(executionSummary, null, 2)}

System context (use only if relevant):
${systemRules}

${memoryContext}

IMPORTANT:
The "User Known Data" section contains information about the user that you MUST use to personalize your response.

MEMORY USAGE RULES (CRITICAL):
- You MUST use memory to personalize and adapt your response.
- Reference the information naturally without mentioning "memory" or showing keys.
- If memory contains preferences, facts, or past interactions, incorporate them.
- Use memory to provide more relevant and personalized answers.
- NEVER ignore relevant memory information.

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
- Personalize using memory and context ACTIVELY.
- Keep it clear, helpful, and human.
- Emojis only at the end.
`;
}

export async function* generateAskResponse(
  userInput: string,
  debug?: boolean,
): AsyncGenerator<string> {
  const systemRules = getSystemContextAsRules();
  const actionsText = buildActionsText();
  
  // Load memory context (sync now)
  const memoryContext = getRelevantMemoryContext(userInput);

  const prompt = buildAskPrompt(userInput, systemRules, actionsText, memoryContext);

  if (debug) {
    console.log("\n[DEBUG] ASK RESPONSE PROMPT:");
    console.log(prompt);
  }

  const config = readAgentConfig();
  const stream = await callOllama(prompt, config.model, true);

  for await (const chunk of stream as AsyncGenerator<string>) {
    yield chunk;
  }
}

export async function* generateResponse(
  executionSummary: ExecutionSummary,
  userInput: string,
  debug?: boolean,
): AsyncGenerator<string> {
  const systemRules = getSystemContextAsRules();
  const actionsText = buildActionsText();
  
  // Load memory context (sync now)
  const memoryContext = getRelevantMemoryContext(userInput);

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

export { loadAllMemory };