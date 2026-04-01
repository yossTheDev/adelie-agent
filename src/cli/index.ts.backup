import readline from "node:readline";
import ora from "ora";
import boxen from "boxen";
import os from "node:os";
import path from "node:path";

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
import { McpInstaller } from "../core/mcp/mcp-installer.js";
import { getMemoryStore } from "../core/memory/memory-store.js";
import { loadAllMemory } from "../core/response/response.js";
import { loadPlannerMemory } from "../core/planner/planner.js";
import { callOllama } from "../core/llm/llm.js";
import { getConversationMemory } from "../core/conversation/conversation-memory.js";

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
  ];

  const content = [
    ascii.trimEnd(),
    "",
    `Hi there! I'm Adelie, your local assistant.`,
    `Currently using: ${cfg.model}`,
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
  mcp                 Manage MCP servers
  skills              Manage skills
  memory              Manage memory
  conversation        Manage conversation history

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
    // Use the new McpInstaller to list servers
    const servers = await McpInstaller.listInstalledServers();
    console.log("MCP servers:");
    if (servers.length === 0) {
      console.log("No MCP servers installed.");
    } else {
      for (const serverName of servers) {
        const serverInfo = await McpInstaller.getServerInfo(serverName);
        if (serverInfo) {
          console.log(
            `- ${serverName} -> ${`${serverInfo.command} ${(serverInfo.args || []).join(" ")}`.trim()}`,
          );
        }
      }
    }
    console.log(`Path: ${path.join(os.homedir(), ".adelie", "mcp-config.json")}`);
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
      console.log("Usage: yi mcp sync-tools <server>");
      return;
    }
    try {
      const result = await McpInstaller.syncTools(name);
      if (result.success) {
        console.log(
          `✅ Synced tools for '${name}': ${result.tools ? result.tools.map(t => t.name).join(", ") || "(none)" : "(none)"}`,
        );
      } else {
        console.error(`❌ Failed to sync tools for '${name}': ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error syncing tools: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "status") {
    try {
      const status = await McpInstaller.getConnectionStatus();
      console.log("🔌 MCP Server Connection Status:");

      for (const [serverName, isConnected] of Object.entries(status)) {
        const statusIcon = isConnected ? "✅" : "❌";
        const statusText = isConnected ? "Connected" : "Disconnected";
        console.log(`  ${statusIcon} ${serverName}: ${statusText}`);
      }

      const connectedCount = Object.values(status).filter(Boolean).length;
      const totalCount = Object.keys(status).length;

      console.log(`\n📊 Summary: ${connectedCount}/${totalCount} servers connected`);
    } catch (error) {
      console.error(`❌ Error getting connection status: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "disconnect") {
    try {
      await McpInstaller.disconnectAll();
      console.log("🔌 Disconnected from all MCP servers");
    } catch (error) {
      console.error(`❌ Error disconnecting: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "test") {
    const [name] = rest;
    if (!name) {
      console.log("Usage: yi mcp test <server>");
      return;
    }

    try {
      console.log(`🧪 Testing connection to MCP server: ${name}`);
      const tools = await McpInstaller.syncTools(name);

      if (tools.success) {
        console.log(`✅ Connection successful!`);
        console.log(`📋 Available tools: ${tools.tools ? tools.tools.length : 0}`);

        if (tools.tools && tools.tools.length > 0) {
          console.log("\nAvailable tools:");
          tools.tools.forEach(tool => {
            console.log(`  • ${tool.name}: ${tool.description || "No description"}`);
          });
        }
      } else {
        console.log(`❌ Connection failed: ${tools.error}`);
      }
    } catch (error) {
      console.error(`❌ Error testing connection: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "remove") {
    const [name] = rest;
    if (!name) {
      console.log("Usage: adelie mcp remove <name>");
      return;
    }
    try {
      const result = await McpInstaller.removeServer(name);
      if (result.success) {
        console.log(`Removed MCP '${name}'.`);
      } else {
        console.log(`Failed to remove: ${result.error}`);
      }
    } catch (error) {
      console.log(`Error removing MCP: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "path") {
    console.log(path.join(os.homedir(), ".adelie", "mcp-config.json"));
    return;
  }

  console.log("Unknown MCP command.");
};

const handleSkillsCommand = async (args: string[]) => {
  const [subcommand, ...rest] = args;
  const { SkillLoader } = await import("../core/skills/skill-loader.js");

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
      console.log("Usage: adelie skills install <file.skill.md|url>");
      console.log("Examples:");
      console.log("  adelie skills install ./my-skill.skill.md");
      console.log("  adelie skills install https://raw.githubusercontent.com/user/repo/main/skill.skill.md");
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

const handleConversationCommand = async (args: string[]) => {
  const [subcommand, ...rest] = args;
  const conversationMemory = getConversationMemory();

  if (!subcommand || subcommand === "list") {
    try {
      const entries = await conversationMemory.getRecentEntries();
      console.log("Recent conversation history:");
      if (entries.length === 0) {
        console.log("  No conversation history found.");
      } else {
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const date = new Date(entry.timestamp).toLocaleString();
          console.log(`\n[${i + 1}] ${date} (${entry.mode})`);
          console.log(`User: ${entry.user_input}`);
          const responsePreview = entry.agent_response.length > 100
            ? entry.agent_response.substring(0, 100) + "..."
            : entry.agent_response;
          console.log(`Agent: ${responsePreview}`);
        }
      }
    } catch (error) {
      console.log(`Error listing conversation: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "clear") {
    try {
      await conversationMemory.clear();
      console.log("Cleared all conversation history");
    } catch (error) {
      console.log(`Error clearing conversation: ${String(error)}`);
    }
    return;
  }

  if (subcommand === "stats") {
    try {
      const stats = await conversationMemory.getStats();
      console.log("Conversation statistics:");
      console.log(`Total entries: ${stats.totalEntries}`);
      console.log(`Total size: ${stats.totalSize} bytes`);
      console.log(`Last updated: ${stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : "Never"}`);
    } catch (error) {
      console.log(`Error getting conversation stats: ${String(error)}`);
    }
    return;
  }

  console.log("Unknown conversation command.");
  console.log("Available commands: list, clear, stats");
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
    await conversationMemory.addEntry({
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
    await conversationMemory.addEntry({
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
        await conversationMemory.addEntry({
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

  // Handle commands
  if (filteredArgs.length > 0) {
    const [command, ...commandArgs] = filteredArgs;

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

    if (command === "conversation") {
      await handleConversationCommand(commandArgs);
      rl.close();
      return;
    }
  }

  // If it's not a known command, treat it as a query
  const query = filteredArgs.join(" ");

  // If no arguments provided, start interactive mode
  if (!query.trim()) {
    await startInteractiveCli();
    return;
  }

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
