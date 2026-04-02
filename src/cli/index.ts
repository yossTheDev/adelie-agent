import readline from "node:readline";
import ora from "ora";
import boxen from "boxen";

import { runPlan } from "../core/executor/executor.js";
import { generatePlan } from "../core/planner/planner.js";
import { generateResponse, generateAskResponse } from "../core/response/response.js";
import type { ExecutionSummary } from "../core/response/types.js";
import { clearAIContext } from "../core/actions/state/state.js";
import { ACTION_ARGS } from "../core/actions/actions.js";
import {
  readAgentConfig,
  writeAgentConfig,
} from "../core/config/agent-config.js";
import { loadPlannerMemory } from "../core/planner/planner.js";
import { callOllama } from "../core/llm/llm.js";
import { getConversationMemory } from "../core/conversation/conversation-memory.js";

// Import modular command system
import { loadCommands } from "./core/command-loader.js";
import { parseArguments, executeCommand } from "./core/command-parser.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q: string) =>
  new Promise<string>((res) => rl.question(q, res));

const DEBUG = false;

const formatStepArgs = (args: Record<string, unknown>): string => {
  try {
    const raw = JSON.stringify(args, null, 2) || "{}";
    if (raw.length <= 240) return raw;
    return `${raw.slice(0, 240)}\n  ...`;
  } catch {
    return "{}";
  }
};

const renderExecutionResult = (result: any, stepIndex: number): void => {
  const status = result.success ? "✅" : "❌";
  const title = `Step ${stepIndex + 1} ${status}`;

  const content = [
    `Action: ${result.action}`,
    `Success: ${result.success}`,
    result.result ? `Result: ${JSON.stringify(result.result, null, 2)}` : "",
  ].filter(Boolean).join("\n");

  console.log(
    boxen(content, {
      title,
      titleAlignment: "left",
      borderStyle: result.success ? "single" : "double",
      padding: { top: 0, right: 1, bottom: 0, left: 1 },
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    })
  );
};

const renderSummary = (totalSteps: number, completedSteps: number, results: any[]): void => {
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  const content = [
    `📊 Execution Summary:`,
    `  • Total Steps: ${totalSteps}`,
    `  • Completed: ${completedSteps}`,
    `  • Successful: ${successCount}`,
    `  • Failed: ${failureCount}`,
  ].join("\n");

  console.log(
    boxen(content, {
      title: "Summary",
      titleAlignment: "center",
      borderStyle: "single",
      padding: { top: 0, right: 2, bottom: 0, left: 2 },
      margin: { top: 1, bottom: 0, left: 0, right: 0 },
    })
  );
};

const renderPlan = (steps: any[]): void => {
  if (steps.length === 0) {
    console.log("\nNo executable plan generated.\n");
    return;
  }

  console.log(`\nExecution Plan (${steps.length} steps):\n`);
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const body = [
      `ID: ${step.id}`,
      `Action: ${step.action}`,
      `Args:\n${formatStepArgs(step.args || {})}`,
    ].join("\n");

    console.log(
      boxen(body, {
        title: `Step ${i + 1}`,
        titleAlignment: "left",
        borderStyle: "single",
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      }),
    );
  }
  console.log();
};

const getBanner = async (mode: string = "planner"): Promise<string> => {
  const cfg = readAgentConfig();
  const actionCount = Object.keys(ACTION_ARGS).length;
  const { McpInstaller } = await import("../core/mcp/mcp-installer.js");
  const mcpServers = await McpInstaller.listInstalledServers();
  const mcpCount = mcpServers.length;

  // Contar herramientas MCP (básico, ya que no tenemos herramientas reales aún)
  let mcpToolsCount = 0;
  for (const serverName of mcpServers) {
    const serverInfo = await McpInstaller.getServerInfo(serverName);
    if (serverInfo) {
      mcpToolsCount += 1; // Placeholder hasta tener sync de herramientas real
    }
  }

  // Get current provider and model information
  const providerManager = (await import("../core/llm/provider-manager.js")).providerManager;
  const currentProvider = providerManager.getCurrentProvider();
  const providerName = cfg.provider || 'unknown';
  let modelName = 'unknown';

  // Get model from current provider config
  if (cfg.providers && cfg.providers[providerName]) {
    const providerConfig = cfg.providers[providerName];
    modelName = providerConfig.model || 'unknown';
  }

  // Mode-specific colors and messages
  const modeConfig = {
    ask: {
      color: "🟢",
      title: "Ask Mode",
      description: "Direct conversation - perfect for questions and chat"
    },
    planner: {
      color: "🔵",
      title: "Planner Mode",
      description: "Planning & execution - perfect for complex tasks"
    },
    auto: {
      color: "🟡",
      title: "Auto Mode",
      description: "Intelligent mode selection based on your query"
    }
  };

  const currentMode = modeConfig[mode as keyof typeof modeConfig] || modeConfig.planner;

  const ascii = `
   _______  ______   _______  _       _________ _______ 
(  ___  )(  __  \ (  ____ \( \      \__   __/(  ____ \
| (   ) || (  \  )| (    \/| (         ) (   | (    \/
| (___) || |   ) || (__    | |         | |   | (__    
|  ___  || |   | ||  __)   | |         | |   |  __)   
| (   ) || |   ) || (      | |         | |   | (      
| )   ( || (__/  )| (____/\| (____/\___) (___| (____/\
|/     \|(______/ (_______/(_______/\_______/(_______/
                                                      
     _______  _______  _______  _       _________     
    (  ___  )(  ____ \(  ____ \( (    /|\__   __/     
    | (   ) || (    \/| (    \/|  \  ( |   ) (        
    | (___) || |      | (__    |   \ | |   | |        
    |  ___  || | ____ |  __)   | (\ \) |   | |        
    | (   ) || | \_  )| (      | | \   |   | |        
    | )   ( || (___) || (____/\| )  \  |   | |        
    |/     \|(_______)(_______/|/    )_)   )_(        
                                                      
`;

  const stats = [
    `📊 System Statistics:`,
    `  • Actions: ${actionCount} registered`,
    `  • MCP Servers: ${mcpCount} installed`,
    `  • MCP Tools: ${mcpToolsCount} available`,
    `  • Provider: ${providerName}`,
    `  • Model: ${modelName}`,
  ];

  const content = [
    ascii.trimEnd(),
    "",
    `Hi there! I'm Adelie, your local assistant.`,
    `Currently using: ${providerName} provider with ${modelName} model`,
    "",
    `${currentMode.color} Current Mode: ${currentMode.title}`,
    `   ${currentMode.description}`,
    "",
    ...stats,
    "",
    `I'm running locally on your machine and ready to help.`,
  ].join("\n");

  return boxen(content, {
    title: "Adelie",
    titleAlignment: "center",
    borderStyle: "single",
    padding: { top: 0, right: 2, bottom: 0, left: 2 },
    margin: { top: 0, bottom: 1, left: 0, right: 0 },
  });
};

const showHelp = (): void => {
  const helpText = `
▲ Adelie v0.1.2 - Your Local Assistant

USAGE:
  adelie [OPTIONS] [COMMAND] [QUERY]

OPTIONS:
  --model <name>       Specify the local model to use
  --context <path>     Set base directory for local indexing
  --config <path>      Path to custom configuration file
  --ask                Use ask mode (direct conversation, no planning)
  --planner            Use planner mode (with action execution)
  --version           Show current version
  --help, -h          Show this help message

COMMANDS:
  config              Manage configuration
  provider            Manage AI providers (OpenAI, Google, OpenRouter, Ollama)
  mcp                 Manage MCP servers
  skills              Manage skills
  memory              Manage memory

MODES:
  --ask               Direct conversation mode (for simple questions)
  --planner           Planning and execution mode (default for most tasks)
  --auto              Auto-detect mode based on query complexity

EXAMPLES:
  adelie "what is the weather like?"                    # Auto-detect mode
  adelie --ask "tell me a joke"                         # Force ask mode
  adelie --planner "create a new project folder"        # Force planner mode
  adelie --model qwen2.5-coder "summarize this file"
  adelie config show
  adelie provider setup
  adelie provider switch openai
  adelie mcp install-preset github

For more information on a specific command, run:
  adelie <command> --help

I'm running locally on your machine and respect your privacy.
`;

  console.log(helpText);
};

const showVersion = (): void => {
  console.log("Adelie v1.0.0");
};






const detectModeWithLLM = async (query: string): Promise<"ask" | "planner"> => {
  const prompt = `Analyze this user query and determine if it requires action planning or is just a conversation:

Query: "${query}"

Respond with ONLY "ask" if it's:
- A simple question or conversation
- Asking for information or explanation
- Casual chat or greeting
- Request for opinion or creative content

Respond with ONLY "planner" if it's:
- Request to create, delete, modify, or manipulate files/systems
- Request to search, find, or locate specific items
- Request to install, build, or execute commands
- Any task that requires step-by-step execution
- File system operations
- External tool usage
- Memory commands: "remember this", "save this", "store this", "recall", "forget", etc.
- Personal information user wants to store
- Requests to remember/recall information

Your response (ask/planner):`;

  try {
    const config = readAgentConfig();
    const response = await callOllama(prompt, config.model, false);
    const result = response.toString().trim().toLowerCase();
    return result.includes("planner") ? "planner" : "ask";
  } catch {
    // Fallback to simple heuristic if LLM fails
    const actionWords = ["create", "delete", "modify", "update", "install", "build", "run", "execute", "search", "find", "list", "show"];
    const memoryWords = ["remember", "save", "store", "recall", "forget", "guarda", "recuerda", "almacena"];
    const hasActionWords = actionWords.some(word => query.toLowerCase().includes(word));
    const hasMemoryWords = memoryWords.some(word => query.toLowerCase().includes(word));
    return (hasActionWords || hasMemoryWords) ? "planner" : "ask";
  }
};

const handleAskMode = async (query: string) => {
  console.log("\nAdelie:\n");

  const spinner = ora({ text: "Thinking...", color: "white" }).start();
  let responseStarted = false;
  let fullResponse = "";

  try {
    for await (const chunk of generateAskResponse(query)) {
      if (!responseStarted) {
        spinner.succeed("Response ready");
        responseStarted = true;
      }
      if (chunk) {
        process.stdout.write(chunk);
        fullResponse += chunk;
      }
    }
  } catch (error) {
    if (!responseStarted) {
      spinner.fail("Response failed");
    }
    console.log("Error:", error);
  }

  console.log();

  // Save conversation entry
  try {
    const conversationMemory = getConversationMemory();
    conversationMemory.addEntry({
      user_input: query,
      agent_response: fullResponse,
      mode: "ask"
    });
  } catch (error) {
    console.error("Failed to save conversation:", error);
  }
};

const handlePlannerMode = async (query: string) => {
  // 1. Planning
  const spinner = ora({ text: "Planning steps...", color: "white" }).start();
  let planResult: any = { plan: [] };

  try {
    planResult = await generatePlan(query);
    spinner.succeed("Planning complete");
  } catch (e) {
    spinner.fail("Planning failed");
    console.log("Error:", e);
    return;
  }

  const steps = planResult || [];
  let allResults: any[] = [];

  // Show plan
  if (steps.length > 0) {
    renderPlan(steps);

    // 2. Execution via Orchestrator
    allResults = await runPlan(steps, false);

    // Show execution summary
    renderSummary(steps.length, allResults.length, allResults);
  }

  // 3. Response
  const executionSummary: ExecutionSummary = {
    total_steps: steps.length,
    completed_steps: allResults.length,
    status: "SUCCESS",
    details: allResults,
  };

  console.log("\nAdelie:\n");

  let fullResponse = "";
  for await (const chunk of generateResponse(executionSummary, query)) {
    if (chunk) {
      process.stdout.write(chunk);
      fullResponse += chunk;
    }
  }

  console.log();

  // Save conversation entry
  try {
    const conversationMemory = getConversationMemory();
    conversationMemory.addEntry({
      user_input: query,
      agent_response: fullResponse,
      mode: "planner",
      execution_summary: executionSummary
    });
  } catch (error) {
    console.error("Failed to save conversation:", error);
  }
};

const startInteractiveCli = async () => {
  console.log(await getBanner("auto"));
  console.log("Type 'exit' to quit\n");

  while (true) {
    const userInput = await ask("You: ");

    if (userInput.toLowerCase() === "exit") break;
    if (!userInput.trim()) continue;

    // Auto-detect mode for interactive mode - use LLM for intelligent detection
    const mode = await detectModeWithLLM(userInput);

    if (mode === "ask") {
      await handleAskMode(userInput);
    } else {
      // 1. Planning
      const spinner = ora({ text: "Planning steps...", color: "white" }).start();
      let planResult: any = { plan: [] };

      try {
        planResult = await generatePlan(userInput);
        spinner.succeed("Planning complete");
      } catch (e) {
        spinner.fail("Planning failed");
        console.log("Error:", e);
        continue;
      }

      const steps = planResult || [];
      let allResults: any[] = [];
      let stopFlow = false;

      // Show plan
      if (steps.length > 0) {
        renderPlan(steps);

        let currentSpinner: any = null;

        // 2. Execution via Orchestrator
        allResults = await runPlan(
          steps,
          false,
          (index, total, step, result, error) => {
            if (!result && !error) {
              // Step Starting
              currentSpinner = ora({
                text: `Running step ${index + 1}/${total}: ${step.action}...`,
                color: "white",
              }).start();
            } else if (error) {
              // Step Crashed
              currentSpinner?.fail(
                `Step ${index + 1} crashed: ${error.message}`,
              );
              renderExecutionResult({ action: step.action, success: false, result: error.message }, index);
            } else if (!result?.success) {
              // Step Failed
              currentSpinner?.fail(
                `Step ${index + 1} failed: ${result?.error || 'Unknown error'}`,
              );
              renderExecutionResult(result, index);
            } else {
              // Step Succeeded
              currentSpinner?.succeed(
                `Step ${index + 1} completed: ${step.action}`,
              );
              renderExecutionResult(result, index);
            }
          },
        );

        // Show execution summary
        renderSummary(steps.length, allResults.length, allResults);
      }

      // 3. Response
      const executionSummary: ExecutionSummary = {
        total_steps: steps.length,
        completed_steps: allResults.length,
        status: stopFlow ? "INTERRUPTED" : "SUCCESS",
        details: allResults,
      };

      if (DEBUG) {
        console.log(JSON.stringify(executionSummary, null, 2));
      }

      console.log("\nAdelie:\n");

      let fullResponse = "";
      for await (const chunk of generateResponse(executionSummary, userInput)) {
        if (chunk) {
          process.stdout.write(chunk);
          fullResponse += chunk;
        }
      }

      console.log("\n" + "—".repeat(50) + "\n");

      // Save conversation entry
      try {
        const conversationMemory = getConversationMemory();
        conversationMemory.addEntry({
          user_input: userInput,
          agent_response: fullResponse,
          mode: "planner",
          execution_summary: executionSummary
        });
      } catch (error) {
        console.error("Failed to save conversation:", error);
      }

      // Clear State Buffer
      clearAIContext();
    }
  }

  rl.close();
};

const main = async () => {
  // Initialize planner memory at startup
  await loadPlannerMemory();

  // Load all commands
  loadCommands();

  const args = process.argv.slice(2);
  const parsedCommand = parseArguments(args);

  // Handle version
  if (parsedCommand.options.version) {
    showVersion();
    rl.close();
    return;
  }

  // Handle help
  if (parsedCommand.options.help) {
    if (parsedCommand.command) {
      // Show command-specific help
      const commandRegistry = await import("./core/command-registry.js").then(m => m.commandRegistry);
      commandRegistry.showHelp(parsedCommand.command);
    } else {
      showHelp();
    }
    rl.close();
    return;
  }

  // Apply model override if provided
  if (parsedCommand.options.model) {
    const config = readAgentConfig();
    writeAgentConfig({ model: parsedCommand.options.model } as any);
    console.log(`Using model: ${parsedCommand.options.model}`);
  }

  // Handle commands
  if (!parsedCommand.isQuery) {
    const result = await executeCommand(parsedCommand);
    if (!result.success && result.message) {
      console.error(result.message);
      process.exit(1);
    }
    rl.close();
    return;
  }

  // If it's not a known command, treat it as a query
  const query = parsedCommand.query || "";

  // If no arguments provided, start interactive mode
  if (!query.trim()) {
    await startInteractiveCli();
    return;
  }

  // Determine mode
  let mode = "auto"; // auto, ask, planner

  if (parsedCommand.options.ask && parsedCommand.options.planner) {
    console.log("Error: Cannot use both --ask and --planner modes simultaneously.");
    rl.close();
    return;
  } else if (parsedCommand.options.ask) {
    mode = "ask";
  } else if (parsedCommand.options.planner) {
    mode = "planner";
  }

  // Auto-detect mode using LLM for intelligent detection
  if (mode === "auto") {
    mode = await detectModeWithLLM(query);
  }

  if (mode === "ask") {
    await handleAskMode(query);
  } else {
    await handlePlannerMode(query);
  }

  rl.close();
};

main();
