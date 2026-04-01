import { ACTION_ARGS } from "../actions/actions.js";
import { readAgentConfig } from "../config/agent-config.js";
import { getSystemContextAsRules } from "../context/get-system-context.js";
import { getMemoryStore } from "../memory/memory-store.js";
import { getConversationMemory } from "../conversation/conversation-memory.js";
import type { ExecutionSummary } from "./types.js";
import { callLLM } from "../llm/provider-manager.js";

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
let loadedConversation: string = "";

const loadAllMemory = async (): Promise<void> => {
  try {
    const memoryStore = getMemoryStore();
    const allMemory = await memoryStore.list();

    if (allMemory.length === 0) {
      loadedMemory = "";
    } else {
      const memoryTexts: string[] = [];
      for (const entry of allMemory) {
        const value = await memoryStore.get(entry.key);
        const formattedValue = formatMemoryValueWithInstruction(entry.key, value, entry.source, entry.instruction);
        memoryTexts.push(formattedValue);
      }

      loadedMemory = memoryTexts.length > 0
        ? `User Known Data (Memory Context):\n${memoryTexts.join("\n")}\n`
        : "";
    }

    // Load conversation history
    const conversationMemory = getConversationMemory();
    const conversationHistory = await conversationMemory.getFormattedHistory();
    loadedConversation = conversationHistory || "";
  } catch {
    loadedMemory = "";
    loadedConversation = "";
  }
};

function getRelevantMemoryContext(userInput: string): string {
  return loadedMemory + loadedConversation;
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

CONVERSATION GUIDELINES:
- This is a natural conversation, not a transactional Q&A
- Reference previous conversation context naturally when relevant
- If user mentions something from earlier in the conversation, acknowledge it
- Build upon previous exchanges to create continuity
- Use memory information to personalize responses naturally
- Respond in the same language as the user (Spanish, English, etc.)

MEMORY USAGE:
- Use stored information about the user naturally without mentioning "memory"
- Incorporate user preferences, past interactions, and known facts
- Reference previous things the user has shared when relevant
- Make the conversation feel continuous and personalized

RESPONSE STYLE:
- Be conversational, warm, and engaging
- Vary responses - don't be repetitive
- Show personality while being helpful
- Use natural language patterns of the user's language
- Keep responses concise but complete
- Add appropriate emojis occasionally at the end

Available Actions (use only when explicitly requested):
${actionsText}

Remember: You're having a conversation, not just answering questions. Make it feel natural and continuous.
`;
}

function buildAgentPrompt(
  userInput: string,
  executionSummary: ExecutionSummary,
  systemRules: string,
  memoryContext: string,
): string {
  return `
You are Adelie, a friendly, helpful, and efficient AI assistant.

User request:
${userInput}

Execution Summary:
${JSON.stringify(executionSummary, null, 2)}

System context (use only if relevant):
${systemRules}

${memoryContext}

CONVERSATION GUIDELINES:
- This is a natural conversation, not just a status report
- Reference previous conversation context when relevant
- Acknowledge what happened in the execution naturally
- Build upon previous exchanges to maintain continuity
- Use memory information to personalize responses naturally
- Respond in the same language as the user (Spanish, English, etc.)

RESPONSE APPROACH:
- Explain results clearly and conversationally
- If tasks succeeded, explain what was accomplished naturally
- If something failed, explain what happened and suggest next steps conversationally
- Reference previous context when relevant to the current task
- Make it feel like a continuous conversation, not isolated transactions

MEMORY USAGE:
- Use stored information about the user naturally without mentioning "memory"
- Incorporate user preferences, past interactions, and known facts
- Reference previous things the user has shared when relevant
- Make the conversation feel continuous and personalized

RESPONSE STYLE:
- Be conversational, warm, and engaging
- Vary responses - don't be repetitive or robotic
- Show personality while being helpful and clear
- Use natural language patterns of the user's language
- Keep responses concise but complete
- Add appropriate emojis occasionally at the end

Remember: You're continuing a conversation, not just reporting results. Make it feel natural and continuous.
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
- Remembering/saving/storing information (any language): "remember", "save", "store", "keep", "guarda", "recuerda", "almacena", "memoriza", "grabar"
- Recalling/retrieving information (any language): "what do you know", "recall", "tell me about", "qué sabes", "recuerda", "dime sobre mí", "about me"
- Forgetting/deleting information (any language): "forget", "delete", "remove", "olvida", "borra", "elimina"
- Asking what you know about the user (any language): "about me", "sobre mí", "my information", "qué sabes de mí"

Respond with ONLY "no_memory" for:
- General questions
- Casual conversation  
- Technical tasks
- File operations
- Creative requests
- Simple greetings

Your response:`;

  let needsMemoryAction = false;

  try {
    const config = readAgentConfig();
    const memoryCheckResponse = await callLLM(memoryCheckPrompt, undefined, false);
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
      const planResponse = await callLLM(memoryPlanPrompt, undefined, false);
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
  const stream = await callLLM(prompt, undefined, true);

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
  const stream = await callLLM(prompt, undefined, true);

  for await (const chunk of stream as AsyncGenerator<string>) {
    yield chunk;
  }
}

export { loadAllMemory };