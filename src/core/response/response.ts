import { ACTION_ARGS } from "../actions/actions.js";
import { readAgentConfig } from "../config/agent-config.js";
import { getSystemContextAsRules } from "../context/get-system-context.js";
import { callOllama } from "../llm/llm.js";
import { getMemoryStore } from "../memory/memory-store.js";
import type { ExecutionSummary } from "./types.js";

function formatMemoryValueWithInstruction(key: string, value: any, source?: string, instruction?: string): string {
  const timestamp = new Date().toISOString();
  const sourceInfo = source ? ` (source: ${source})` : "";
  const instructionInfo = instruction ? `\n  📋 Context instruction: "${instruction}"` : "";
  
  if (typeof value === 'string') {
    return `📝 ${key}: "${value}"${sourceInfo}${instructionInfo}`;
  } else if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return `📋 ${key}: [${value.map(item => JSON.stringify(item)).join(', ')}]${sourceInfo}${instructionInfo}`;
    } else {
      const objStr = JSON.stringify(value, null, 2);
      return `🗂️ ${key}: ${objStr}${sourceInfo}${instructionInfo}`;
    }
  } else if (typeof value === 'boolean') {
    return `✅ ${key}: ${value ? 'true' : 'false'}${sourceInfo}${instructionInfo}`;
  } else if (typeof value === 'number') {
    return `🔢 ${key}: ${value}${sourceInfo}${instructionInfo}`;
  } else {
    return `❓ ${key}: ${JSON.stringify(value)}${sourceInfo}${instructionInfo}`;
  }
}

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
      const formattedValue = formatMemoryValueWithInstruction(entry.key, value, entry.source, entry.instruction);
      memoryTexts.push(formattedValue);
    }

    loadedMemory = memoryTexts.length > 0
      ? `User Known Data (Memory Context):\n${memoryTexts.join("\n")}\n`
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

MEMORY COMMANDS:
You have access to memory actions that you can use when the user asks:
- To remember/save information: Use this naturally when user says "remember this", "save this", "guarda esto", etc.
- To recall information: Use stored memory when user asks "what do you know about me", "recuerda", etc.
- To forget information: Use when user asks to forget something

Available Actions:
${actionsText}

Instructions:
- MANDATORY: Respond in the same language as the user.
- This is a conversation, but you can use memory actions when needed.
- Be natural, friendly, and human-like.
- Keep responses concise but engaging.
- Use memory and context ACTIVELY to personalize responses.
- When user asks you to remember something, acknowledge that you'll store it.
- When user asks what you know about them, use your stored information.
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
  
  // CRITICAL: Load memory BEFORE processing the request
  await loadAllMemory();
  
  // Check if this might be a memory-related query using LLM
  const memoryCheckPrompt = `Analyze this user query and determine if it requires memory actions.

Query: "${userInput}"

Available memory actions:
- MEMORY_SET: Store information in memory
- MEMORY_DELETE: Remove information from memory
- MEMORY_SEARCH: Search for information in memory
- MEMORY_LIST: List all memory keys

Respond with ONLY "memory_needed" if the query involves:
- Remembering/saving/storing information: "remember", "save", "store", "keep", "guarda", "recuerda", "almacena"
- Recalling/retrieving information: "what do you know", "recall", "tell me about", "qué sabes sobre mí"
- Forgetting/deleting information: "forget", "delete", "remove", "olvida", "borra"
- Asking what you know about the user: "about me", "sobre mí", "my information"

Respond with ONLY "no_memory" for:
- General questions
- Casual conversation
- Technical tasks
- File operations
- Creative requests

Your response:`;

  let needsMemoryAction = false;
  
  try {
    const config = readAgentConfig();
    const memoryCheckResponse = await callOllama(memoryCheckPrompt, config.model, false);
    const result = memoryCheckResponse.toString().trim().toLowerCase();
    needsMemoryAction = result.includes("memory_needed");
  } catch {
    // If LLM check fails, continue with normal flow
  }

  if (needsMemoryAction) {
    // Generate a small memory plan
    const memoryPlanPrompt = `Create a simple memory plan for this user request:

Query: "${userInput}"

Available actions:
- MEMORY_SET: Store information (key, value, source?, instruction?)
- MEMORY_DELETE: Remove information (key)
- MEMORY_SEARCH: Search information (query)
- MEMORY_LIST: List all keys ()

Respond with ONLY a JSON array of steps. Each step should have:
- id: unique step name
- action: one of the available actions
- args: object with action parameters

Examples:
[{"id": "store_name", "action": "MEMORY_SET", "args": {"key": "user_name", "value": "John"}}]
[{"id": "search_info", "action": "MEMORY_SEARCH", "args": {"query": "name"}}]

Your response:`;

    try {
      const config = readAgentConfig();
      const planResponse = await callOllama(memoryPlanPrompt, config.model, false);
      const planText = planResponse.toString().trim();
      
      // Parse and execute the memory plan
      let plan = [];
      try {
        plan = JSON.parse(planText);
      } catch {
        // If parsing fails, continue with normal flow
      }

      if (plan.length > 0) {
        // Execute memory actions using the same approach as planner
        const { runPlan } = await import("../executor/executor.js");
        const results = await runPlan(plan, false);
        
        // After executing memory actions, continue with normal LLM response
        // The LLM will naturally respond based on the updated memory context
      }
    } catch {
      // If memory planning fails, continue with normal flow
    }
  }
  
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
  
  // CRITICAL: Load memory BEFORE processing the request
  await loadAllMemory();
  
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