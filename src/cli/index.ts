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
  getAgentConfigPaths,
  readAgentConfig,
  resetAgentConfig,
  writeAgentConfig,
} from "../core/config/agent-config.js";
import {
  getMcpConfigPath,
  installMcpServer,
  listMcpServers,
  removeMcpServer,
  syncMcpServerTools,
  updateMcpServerEnv,
} from "../core/config/mcp-config.js";
import { listMcpTools } from "../core/mcp/mcp-runtime.js";
import { SkillLoader } from "../core/skills/skill-loader.js";
import { McpInstaller } from "../core/mcp/mcp-installer.js";
import { getMemoryStore } from "../core/memory/memory-store.js";
import { loadAllMemory } from "../core/response/response.js";
import { loadPlannerMemory } from "../core/planner/planner.js";

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

const getBanner = async (): Promise<string> => {
  const cfg = readAgentConfig();
  const actionCount = Object.keys(ACTION_ARGS).length;
  const mcpServers = listMcpServers();
  const mcpCount = mcpServers.length;
  
  // Contar herramientas MCP
  let mcpToolsCount = 0;
  for (const server of mcpServers) {
    mcpToolsCount += server.tools?.length || 0;
  }

  const ascii = `
    ▲   ▲
   ▲ Adelie ▲
  ▲   ▲
`;

  const stats = [
    `📊 System Statistics:`,
    `  • Actions: ${actionCount} registered`,
    `  • MCP Servers: ${mcpCount} installed`,
    `  • MCP Tools: ${mcpToolsCount} available`,
  ];

  const content = [
    ascii.trimEnd(),
    "",
    `Hi there! I'm Adelie, your local assistant.`,
    `Currently using: ${cfg.model}`,
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
▲ Adelie v1.0.0 - Your Local Assistant

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
  mcp                 Manage MCP servers
  skills              Manage skills
  memory              Manage memory

MODES:
  --ask               Direct conversation mode (default for simple queries)
  --planner           Planning and execution mode (default for complex tasks)

EXAMPLES:
  adelie "what is the weather like?"                    # Auto-detect mode
  adelie --ask "tell me a joke"                         # Force ask mode
  adelie --planner "create a new project folder"        # Force planner mode
  adelie --model qwen2.5-coder "summarize this file"
  adelie config show
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

const handleConfigCommand = (args: string[]) => {
  const [subcommand, ...rest] = args;
  const paths = getAgentConfigPaths();

  if (!subcommand || subcommand === "show") {
    const cfg = readAgentConfig();
    console.log("Current config:");
    console.log(JSON.stringify(cfg, null, 2));
    console.log(`Path: ${paths.configPath}`);
    return;
  }

  if (subcommand === "path") {
    console.log(paths.configPath);
    return;
  }

  if (subcommand === "reset") {
    const cfg = resetAgentConfig();
    console.log("Config reset to defaults.");
    console.log(JSON.stringify(cfg, null, 2));
    return;
  }

  if (subcommand === "set") {
    const [key, ...valueParts] = rest;
    const valueRaw = valueParts.join(" ").trim();
    if (!key || !valueRaw) {
      console.log(
        "Usage: adelie config set <model|ollama_url|debug|max_loop_iterations|language> <value>",
      );
      return;
    }

    let value: string | boolean | number = valueRaw;
    if (key === "debug") value = valueRaw.toLowerCase() === "true";
    if (key === "max_loop_iterations") value = Number(valueRaw);

    const next = writeAgentConfig({ [key]: value } as any);
    console.log(`Updated '${key}'.`);
    console.log(JSON.stringify(next, null, 2));
    return;
  }

  console.log("Unknown config command.");
};

const handleMcpCommand = async (args: string[]) => {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "list") {
    const servers = listMcpServers();
    console.log("MCP servers:");
    if (servers.length === 0) {
      console.log("No MCP servers installed.");
    } else {
      for (const s of servers) {
        console.log(
          `- ${s.name} -> ${`${s.command} ${s.args.join(" ")}`.trim()}`,
        );
        if (s.tools.length > 0) {
          console.log(`  tools: ${s.tools.join(", ")}`);
        }
      }
    }
    console.log(`Path: ${getMcpConfigPath()}`);
    return;
  }

  if (subcommand === "install") {
    const [name, command, ...rawArgs] = rest;
    if (!name || !command) {
      console.log(
        "Usage: adelie mcp install <name> <command> [args...] [--tools=tool1,tool2]",
      );
      return;
    }
    const toolFlag = rawArgs.find((a) => a.startsWith("--tools="));
    const commandArgs = rawArgs.filter((a) => !a.startsWith("--tools="));
    const tools = toolFlag
      ? toolFlag
          .replace("--tools=", "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const server = installMcpServer({ name, command, commandArgs, tools });
    console.log(`Installed MCP '${server.name}'.`);
    return;
  }

  if (subcommand === "install-preset") {
    const [preset] = rest;
    if (!preset) {
      console.log(
        "Usage: adelie mcp install-preset <preset-name>",
      );
      console.log("Available presets: github, web-search, docs, file-index, database, pdf, shell-system, complete");
      return;
    }

    const spinner = ora(`Installing MCP preset '${preset}'...`).start();
    try {
      const result = await McpInstaller.installPreset(preset);
      if (result.success) {
        spinner.succeed(`MCP preset '${preset}' installed successfully.`);
        console.log("Note: Some MCP servers may require environment variables to be set.");
      } else {
        spinner.fail(`Installation failed: ${result.error}`);
      }
    } catch (error) {
      spinner.fail(`Installation failed: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "set-env") {
    const [name, envKey, ...envValueParts] = rest;
    const envValue = envValueParts.join(" ");
    if (!name || !envKey || !envValue) {
      console.log(
        "Usage: adelie mcp set-env <server> <ENV_KEY> <value>",
      );
      return;
    }
    const updated = updateMcpServerEnv(name, { [envKey]: envValue });
    if (!updated) {
      console.log(`MCP '${name}' was not found.`);
      return;
    }
    console.log(`Updated env '${envKey}' for MCP '${name}'.`);
    return;
  }

  if (subcommand === "sync-tools") {
    const [name] = rest;
    if (!name) {
      console.log("Usage: adelie mcp sync-tools <server>");
      return;
    }
    try {
      const tools = await listMcpTools(name);
      const updated = syncMcpServerTools(name, tools);
      if (!updated) {
        console.log(`MCP '${name}' was not found.`);
        return;
      }
      console.log(
        `Synced ${tools.length} tools for '${name}': ${tools.join(", ") || "(none)"}`,
      );
    } catch (error) {
      console.log(`Failed to sync MCP tools: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "remove") {
    const [name] = rest;
    if (!name) {
      console.log("Usage: adelie mcp remove <name>");
      return;
    }
    const removed = removeMcpServer(name);
    console.log(
      removed
        ? `Removed MCP '${name}'.`
        : `MCP '${name}' was not found.`,
    );
    return;
  }

  if (subcommand === "path") {
    console.log(getMcpConfigPath());
    return;
  }

  console.log("Unknown MCP command.");
};

const handleSkillsCommand = async (args: string[]) => {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "list") {
    await SkillLoader.loadAllSkills();
    const skills = SkillLoader.getAllSkills();
    
    console.log("Available skills:");
    if (skills.length === 0) {
      console.log("  No skills installed.");
      console.log("  Install skills with: adelie skills install <file.skill.md>");
    } else {
      for (const skill of skills) {
        console.log(
          `- ${skill.name}: ${skill.description}`,
        );
        console.log(`  When to use: ${skill.whenToUse.join(", ")}`);
        if (skill.mcpServer) {
          console.log(`  Requires MCP: ${skill.mcpServer}`);
        }
        console.log("");
      }
    }
    return;
  }

  if (subcommand === "install") {
    const [filePath] = rest;
    if (!filePath) {
      console.log("Usage: adelie skills install <file.skill.md>");
      return;
    }

    const spinner = ora("Installing skill...").start();
    try {
      const result = await SkillLoader.installSkillFile(filePath);
      if (result.success) {
        spinner.succeed("Skill installed successfully.");
      } else {
        spinner.fail(`Installation failed: ${result.error}`);
      }
    } catch (error) {
      spinner.fail(`Installation failed: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "remove") {
    const [skillName] = rest;
    if (!skillName) {
      console.log("Usage: adelie skills remove <skill-name>");
      return;
    }

    const spinner = ora("Removing skill...").start();
    try {
      const result = await SkillLoader.removeSkill(skillName);
      if (result.success) {
        spinner.succeed(`Skill '${skillName}' removed successfully.`);
      } else {
        spinner.fail(`Removal failed: ${result.error}`);
      }
    } catch (error) {
      spinner.fail(`Removal failed: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "validate") {
    const spinner = ora("Validating skills...").start();
    try {
      const result = await SkillLoader.validateAllSkills();
      if (result.valid) {
        spinner.succeed("All skills are valid.");
      } else {
        spinner.fail("Validation errors found:");
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
      }
    } catch (error) {
      spinner.fail(`Validation failed: ${String(error)}`);
    }
    return;
  }

  console.log("Unknown skills command.");
  console.log("Available commands: list, install, remove, validate");
};

const handleMemoryCommand = async (args: string[]) => {
  const [subcommand, ...rest] = args;
  const memoryStore = getMemoryStore();

  if (!subcommand || subcommand === "list") {
    try {
      const list = await memoryStore.list();
      console.log("Memory keys:");
      if (list.length === 0) {
        console.log("  No memory entries found.");
      } else {
        for (const entry of list) {
          console.log(`- ${entry.key}`);
          console.log(`  Created: ${new Date(entry.timestamp).toLocaleString()}`);
          if (entry.source) {
            console.log(`  Source: ${entry.source}`);
          }
          console.log("");
        }
      }
    } catch (error) {
      console.log(`Error listing memory: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "set") {
    const [key, ...restArgs] = rest;
    if (!key || restArgs.length === 0) {
      console.log("Usage: adelie memory set <key> <value> [--instruction \"AI instruction\"]");
      console.log("Note: Use quotes around values with spaces");
      console.log("Example: adelie memory set user_profile \"Alice is a developer\" --instruction \"Extract user information as JSON\"");
      return;
    }

    // Parse instruction flag
    let value = "";
    let instruction = "";
    let instructionFound = false;
    
    for (let i = 0; i < restArgs.length; i++) {
      if (restArgs[i] === "--instruction" && i + 1 < restArgs.length) {
        instruction = restArgs[i + 1];
        instructionFound = true;
        i++; // Skip the next argument as it's the instruction value
      } else if (!instructionFound) {
        value += (value ? " " : "") + restArgs[i];
      }
    }
    
    try {
      // Try to parse as JSON first
      let parsedValue;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }

      // Use the memory action instead of direct store to support AI processing
      const { memorySet } = await import("../core/actions/memory/memory.js");
      const [success, result] = await memorySet({
        key,
        value: parsedValue,
        source: "cli",
        instruction: instruction || undefined
      });
      
      if (success) {
        console.log(`Set memory key '${key}'${instruction ? " with AI processing" : ""}`);
      } else {
        console.log(`Error setting memory: ${result}`);
      }
    } catch (error) {
      console.log(`Error setting memory: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "delete") {
    const [key] = rest;
    if (!key) {
      console.log("Usage: adelie memory delete <key>");
      return;
    }

    try {
      await memoryStore.delete(key);
      console.log(`Deleted memory key '${key}'`);
    } catch (error) {
      console.log(`Error deleting memory: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "clear") {
    try {
      await memoryStore.clear();
      console.log("Cleared all memory");
    } catch (error) {
      console.log(`Error clearing memory: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "search") {
    const [query] = rest;
    if (!query) {
      console.log("Usage: adelie memory search <query>");
      return;
    }

    try {
      const results = await memoryStore.search(query);
      console.log(`Search results for '${query}':`);
      if (results.length === 0) {
        console.log("  No matching entries found.");
      } else {
        for (const result of results) {
          console.log(`- ${result.key}`);
          console.log(`  Value: ${JSON.stringify(result.value)}`);
          console.log(`  Created: ${new Date(result.timestamp).toLocaleString()}`);
          if (result.source) {
            console.log(`  Source: ${result.source}`);
          }
          console.log("");
        }
      }
    } catch (error) {
      console.log(`Error searching memory: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "stats") {
    try {
      const stats = await memoryStore.stats();
      console.log("Memory statistics:");
      console.log(`Total keys: ${stats.totalKeys}`);
      console.log(`Total size: ${stats.totalSize}`);
      console.log(`Last updated: ${stats.lastUpdated}`);
    } catch (error) {
      console.log(`Error getting memory stats: ${String(error)}`);
    }
    return;
  }

  console.log("Unknown memory command.");
  console.log("Available commands: list, set, delete, clear, search, stats");
  console.log("Note: Memory is automatically loaded and used in responses - no 'get' command needed");
};

const startInteractiveCli = async () => {
  console.log(await getBanner());
  console.log("Type 'exit' to quit\n");

  while (true) {
    const userInput = await ask("You: ");

    if (userInput.toLowerCase() === "exit") break;
    if (!userInput.trim()) continue;

    // Auto-detect mode for interactive mode
    const actionWords = ["create", "delete", "modify", "update", "install", "build", "run", "execute", "search", "find", "list", "show"];
    const hasActionWords = actionWords.some(word => userInput.toLowerCase().includes(word));
    const isShortQuery = userInput.split(" ").length <= 10;
    
    const mode = (isShortQuery && !hasActionWords) ? "ask" : "planner";
    
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

      for await (const chunk of generateResponse(executionSummary, userInput)) {
        if (chunk) process.stdout.write(chunk);
      }

      console.log("\n" + "—".repeat(50) + "\n");

      // Clear State Buffer
      clearAIContext();
    }
  }

  rl.close();
};

const handleAskMode = async (query: string) => {
  console.log("\nAdelie:\n");
  
  const spinner = ora({ text: "Thinking...", color: "white" }).start();
  let responseStarted = false;
  
  try {
    for await (const chunk of generateAskResponse(query)) {
      if (!responseStarted) {
        spinner.succeed("Response ready");
        responseStarted = true;
      }
      if (chunk) process.stdout.write(chunk);
    }
  } catch (error) {
    if (!responseStarted) {
      spinner.fail("Response failed");
    }
    console.log("Error:", error);
  }
  
  console.log();
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

  for await (const chunk of generateResponse(executionSummary, query)) {
    if (chunk) process.stdout.write(chunk);
  }

  console.log();
};

const main = async () => {
  // Initialize memory loading at startup
  await loadAllMemory();
  await loadPlannerMemory();

  const args = process.argv.slice(2);
  
  // Parse CLI options
  const options = {
    model: null as string | null,
    context: null as string | null,
    config: null as string | null,
    ask: false as boolean,
    planner: false as boolean,
    version: false,
    help: false,
  };
  
  // Extract options (everything starting with --)
  const filteredArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--version") {
      options.version = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--ask") {
      options.ask = true;
    } else if (arg === "--planner") {
      options.planner = true;
    } else if (arg === "--model" && i + 1 < args.length) {
      options.model = args[i + 1];
      i++; // Skip next argument
    } else if (arg === "--context" && i + 1 < args.length) {
      options.context = args[i + 1];
      i++; // Skip next argument
    } else if (arg === "--config" && i + 1 < args.length) {
      options.config = args[i + 1];
      i++; // Skip next argument
    } else {
      filteredArgs.push(arg);
    }
  }
  
  // Handle version
  if (options.version) {
    showVersion();
    rl.close();
    return;
  }
  
  // Handle help
  if (options.help) {
    showHelp();
    rl.close();
    return;
  }
  
  // Apply model override if provided
  if (options.model) {
    const config = readAgentConfig();
    writeAgentConfig({ model: options.model } as any);
    console.log(`Using model: ${options.model}`);
  }
  
  const [command, ...commandArgs] = filteredArgs;

  if (!command) {
    await startInteractiveCli();
    return;
  }

  if (command === "config") {
    handleConfigCommand(commandArgs);
    rl.close();
    return;
  }

  if (command === "mcp") {
    await handleMcpCommand(commandArgs);
    rl.close();
    return;
  }

  if (command === "skills") {
    await handleSkillsCommand(commandArgs);
    rl.close();
    return;
  }

  if (command === "memory") {
    await handleMemoryCommand(commandArgs);
    rl.close();
    return;
  }

  // If it's not a known command, treat it as a query
  const query = [command, ...commandArgs].join(" ");
  
  // Determine mode
  let mode = "auto"; // auto, ask, planner
  
  if (options.ask && options.planner) {
    console.log("Error: Cannot use both --ask and --planner modes simultaneously.");
    rl.close();
    return;
  } else if (options.ask) {
    mode = "ask";
  } else if (options.planner) {
    mode = "planner";
  }
  
  // Auto-detect mode for simple queries vs complex tasks
  if (mode === "auto") {
    // Simple heuristic: if query is short and doesn't contain action words, use ask mode
    const actionWords = ["create", "delete", "modify", "update", "install", "build", "run", "execute", "search", "find", "list", "show"];
    const hasActionWords = actionWords.some(word => query.toLowerCase().includes(word));
    const isShortQuery = query.split(" ").length <= 10;
    
    mode = (isShortQuery && !hasActionWords) ? "ask" : "planner";
  }
  
  if (mode === "ask") {
    await handleAskMode(query);
  } else {
    await handlePlannerMode(query);
  }
  
  rl.close();
};

main();
