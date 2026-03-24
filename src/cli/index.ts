import chalk from "chalk";
import readline from "node:readline";
import ora from "ora";
import boxen from "boxen";

import { runPlan } from "../core/executor/executor.js";
import { generatePlan } from "../core/planner/planner.js";
import { generateResponse } from "../core/response/response.js";
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q: string) =>
  new Promise<string>((res) => rl.question(chalk.yellowBright.bold(q), res));

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

const renderPlan = (steps: any[]): void => {
  if (steps.length === 0) {
    console.log(chalk.gray("\nNo executable plan generated.\n"));
    return;
  }

  console.log(chalk.blueBright(`\nExecution Plan (${steps.length} steps):\n`));
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const body = [
      `${chalk.whiteBright("ID:")} ${chalk.cyan(step.id)}`,
      `${chalk.whiteBright("Action:")} ${chalk.magenta(step.action)}`,
      `${chalk.whiteBright("Args:")}\n${chalk.gray(formatStepArgs(step.args || {}))}`,
    ].join("\n");

    console.log(
      boxen(body, {
        title: `Step ${i + 1}`,
        titleAlignment: "left",
        borderStyle: "single",
        borderColor: "blue",
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      }),
    );
  }
  console.log();
};

const getBanner = (): string => {
  const cfg = readAgentConfig();
  const actionCount = Object.keys(ACTION_ARGS).length;
  const ascii = `
██╗   ██╗██╗
╚██╗ ██╔╝██║
 ╚████╔╝ ██║
  ╚██╔╝  ██║
   ██║   ██║
   ╚═╝   ╚═╝
`;

  const content = [
    chalk.cyanBright.bold(ascii.trimEnd()),
    "",
    `${chalk.whiteBright("Model:")} ${chalk.greenBright(cfg.model)}`,
    `${chalk.whiteBright("Functions:")} ${chalk.magentaBright(String(actionCount))}`,
    `${chalk.whiteBright("Mode:")} ${chalk.yellowBright("Deterministic Planner + Executor")}`,
  ].join("\n");

  return boxen(content, {
    title: "YI Agent",
    titleAlignment: "center",
    borderStyle: "round",
    borderColor: "cyan",
    padding: 1,
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
  });
};

const handleConfigCommand = (args: string[]) => {
  const [subcommand, ...rest] = args;
  const paths = getAgentConfigPaths();

  if (!subcommand || subcommand === "show") {
    const cfg = readAgentConfig();
    console.log(chalk.cyanBright("Current config:"));
    console.log(JSON.stringify(cfg, null, 2));
    console.log(chalk.gray(`Path: ${paths.configPath}`));
    return;
  }

  if (subcommand === "path") {
    console.log(paths.configPath);
    return;
  }

  if (subcommand === "reset") {
    const cfg = resetAgentConfig();
    console.log(chalk.green("Config reset to defaults."));
    console.log(JSON.stringify(cfg, null, 2));
    return;
  }

  if (subcommand === "set") {
    const [key, ...valueParts] = rest;
    const valueRaw = valueParts.join(" ").trim();
    if (!key || !valueRaw) {
      console.log(
        chalk.yellow("Usage: yi config set <model|ollama_url|debug|max_loop_iterations|language> <value>"),
      );
      return;
    }

    let value: string | boolean | number = valueRaw;
    if (key === "debug") value = valueRaw.toLowerCase() === "true";
    if (key === "max_loop_iterations") value = Number(valueRaw);

    const next = writeAgentConfig({ [key]: value } as any);
    console.log(chalk.green(`Updated '${key}'.`));
    console.log(JSON.stringify(next, null, 2));
    return;
  }

  console.log(chalk.yellow("Unknown config command."));
};

const handleMcpCommand = async (args: string[]) => {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "list") {
    const servers = listMcpServers();
    console.log(chalk.cyanBright("MCP servers:"));
    if (servers.length === 0) {
      console.log(chalk.gray("No MCP servers installed."));
    } else {
      for (const s of servers) {
        console.log(
          `- ${chalk.magenta(s.name)} -> ${chalk.white(
            `${s.command} ${s.args.join(" ")}`.trim(),
          )}`,
        );
        if (s.tools.length > 0) {
          console.log(`  ${chalk.gray(`tools: ${s.tools.join(", ")}`)}`);
        }
      }
    }
    console.log(chalk.gray(`Path: ${getMcpConfigPath()}`));
    return;
  }

  if (subcommand === "install") {
    const [name, command, ...rawArgs] = rest;
    if (!name || !command) {
      console.log(
        chalk.yellow("Usage: yi mcp install <name> <command> [args...] [--tools=tool1,tool2]"),
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
    console.log(chalk.green(`Installed MCP '${server.name}'.`));
    return;
  }

  if (subcommand === "install-preset") {
    const [preset] = rest;
    if (!preset) {
      console.log(
        chalk.yellow("Usage: yi mcp install-preset <preset-name>"),
      );
      console.log(chalk.yellow("Available presets: github, web-search, docs, file-index, database, pdf, shell-system, complete"));
      return;
    }

    const spinner = ora(`Installing MCP preset '${preset}'...`).start();
    try {
      const result = await McpInstaller.installPreset(preset);
      if (result.success) {
        spinner.succeed(chalk.green(`MCP preset '${preset}' installed successfully.`));
        console.log(chalk.yellow("Note: Some MCP servers may require environment variables to be set."));
      } else {
        spinner.fail(chalk.red(`Installation failed: ${result.error}`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Installation failed: ${String(error)}`));
    }
    return;
  }

  if (subcommand === "set-env") {
    const [name, envKey, ...envValueParts] = rest;
    const envValue = envValueParts.join(" ");
    if (!name || !envKey || !envValue) {
      console.log(
        chalk.yellow("Usage: yi mcp set-env <server> <ENV_KEY> <value>"),
      );
      return;
    }
    const updated = updateMcpServerEnv(name, { [envKey]: envValue });
    if (!updated) {
      console.log(chalk.yellow(`MCP '${name}' was not found.`));
      return;
    }
    console.log(chalk.green(`Updated env '${envKey}' for MCP '${name}'.`));
    return;
  }

  if (subcommand === "sync-tools") {
    const [name] = rest;
    if (!name) {
      console.log(chalk.yellow("Usage: yi mcp sync-tools <server>"));
      return;
    }
    try {
      const tools = await listMcpTools(name);
      const updated = syncMcpServerTools(name, tools);
      if (!updated) {
        console.log(chalk.yellow(`MCP '${name}' was not found.`));
        return;
      }
      console.log(
        chalk.green(
          `Synced ${tools.length} tools for '${name}': ${tools.join(", ") || "(none)"}`,
        ),
      );
    } catch (error) {
      console.log(chalk.red(`Failed to sync MCP tools: ${String(error)}`));
    }
    return;
  }

  if (subcommand === "remove") {
    const [name] = rest;
    if (!name) {
      console.log(chalk.yellow("Usage: yi mcp remove <name>"));
      return;
    }
    const removed = removeMcpServer(name);
    console.log(
      removed
        ? chalk.green(`Removed MCP '${name}'.`)
        : chalk.yellow(`MCP '${name}' was not found.`),
    );
    return;
  }

  if (subcommand === "path") {
    console.log(getMcpConfigPath());
    return;
  }

  console.log(chalk.yellow("Unknown MCP command."));
};

const handleSkillsCommand = async (args: string[]) => {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "list") {
    await SkillLoader.loadAllSkills();
    const skills = SkillLoader.getAllSkills();
    
    console.log(chalk.cyanBright("Available skills:"));
    if (skills.length === 0) {
      console.log(chalk.gray("  No skills installed."));
      console.log(chalk.yellow("  Install skills with: yi skills install <file.skill.md>"));
    } else {
      for (const skill of skills) {
        console.log(
          `- ${chalk.magenta(skill.name)}: ${chalk.white(skill.description)}`,
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
      console.log(chalk.yellow("Usage: yi skills install <file.skill.md>"));
      return;
    }

    const spinner = ora("Installing skill...").start();
    try {
      const result = await SkillLoader.installSkillFile(filePath);
      if (result.success) {
        spinner.succeed(chalk.green(`Skill installed successfully.`));
      } else {
        spinner.fail(chalk.red(`Installation failed: ${result.error}`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Installation failed: ${String(error)}`));
    }
    return;
  }

  if (subcommand === "remove") {
    const [skillName] = rest;
    if (!skillName) {
      console.log(chalk.yellow("Usage: yi skills remove <skill-name>"));
      return;
    }

    const spinner = ora("Removing skill...").start();
    try {
      const result = await SkillLoader.removeSkill(skillName);
      if (result.success) {
        spinner.succeed(chalk.green(`Skill '${skillName}' removed successfully.`));
      } else {
        spinner.fail(chalk.red(`Removal failed: ${result.error}`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Removal failed: ${String(error)}`));
    }
    return;
  }

  if (subcommand === "validate") {
    const spinner = ora("Validating skills...").start();
    try {
      const result = await SkillLoader.validateAllSkills();
      if (result.valid) {
        spinner.succeed(chalk.green("All skills are valid."));
      } else {
        spinner.fail(chalk.red("Validation errors found:"));
        for (const error of result.errors) {
          console.log(chalk.red(`  - ${error}`));
        }
      }
    } catch (error) {
      spinner.fail(chalk.red(`Validation failed: ${String(error)}`));
    }
    return;
  }

  console.log(chalk.yellow("Unknown skills command."));
  console.log(chalk.yellow("Available commands: list, install, remove, validate"));
};

const handleMemoryCommand = async (args: string[]) => {
  const [subcommand, ...rest] = args;
  const memoryStore = getMemoryStore();

  if (!subcommand || subcommand === "list") {
    try {
      const list = await memoryStore.list();
      console.log(chalk.cyanBright("Memory keys:"));
      if (list.length === 0) {
        console.log(chalk.gray("  No memory entries found."));
      } else {
        for (const entry of list) {
          console.log(`- ${chalk.magenta(entry.key)}`);
          console.log(`  Created: ${chalk.gray(new Date(entry.timestamp).toLocaleString())}`);
          if (entry.source) {
            console.log(`  Source: ${chalk.gray(entry.source)}`);
          }
          console.log("");
        }
      }
    } catch (error) {
      console.log(chalk.red(`Error listing memory: ${String(error)}`));
    }
    return;
  }

  if (subcommand === "get") {
    const [key] = rest;
    if (!key) {
      console.log(chalk.yellow("Usage: yi memory get <key>"));
      return;
    }

    try {
      const value = await memoryStore.get(key);
      console.log(chalk.cyanBright(`Memory key '${key}':`));
      console.log(JSON.stringify(value, null, 2));
    } catch (error) {
      console.log(chalk.red(`Error getting memory: ${String(error)}`));
    }
    return;
  }

  if (subcommand === "set") {
    const [key, ...restArgs] = rest;
    if (!key || restArgs.length === 0) {
      console.log(chalk.yellow("Usage: yi memory set <key> <value> [--instruction \"AI instruction\"]"));
      console.log(chalk.gray("Note: Use quotes around values with spaces"));
      console.log(chalk.gray("Example: yi memory set user_profile \"Alice is a developer\" --instruction \"Extract user information as JSON\""));
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
        console.log(chalk.green(`Set memory key '${key}'${instruction ? " with AI processing" : ""}`));
      } else {
        console.log(chalk.red(`Error setting memory: ${result}`));
      }
    } catch (error) {
      console.log(chalk.red(`Error setting memory: ${String(error)}`));
    }
    return;
  }

  if (subcommand === "delete") {
    const [key] = rest;
    if (!key) {
      console.log(chalk.yellow("Usage: yi memory delete <key>"));
      return;
    }

    try {
      await memoryStore.delete(key);
      console.log(chalk.green(`Deleted memory key '${key}'`));
    } catch (error) {
      console.log(chalk.red(`Error deleting memory: ${String(error)}`));
    }
    return;
  }

  if (subcommand === "clear") {
    try {
      await memoryStore.clear();
      console.log(chalk.green("Cleared all memory"));
    } catch (error) {
      console.log(chalk.red(`Error clearing memory: ${String(error)}`));
    }
    return;
  }

  if (subcommand === "search") {
    const [query] = rest;
    if (!query) {
      console.log(chalk.yellow("Usage: yi memory search <query>"));
      return;
    }

    try {
      const results = await memoryStore.search(query);
      console.log(chalk.cyanBright(`Search results for '${query}':`));
      if (results.length === 0) {
        console.log(chalk.gray("  No matching entries found."));
      } else {
        for (const result of results) {
          console.log(`- ${chalk.magenta(result.key)}`);
          console.log(`  Value: ${JSON.stringify(result.value)}`);
          console.log(`  Created: ${chalk.gray(new Date(result.timestamp).toLocaleString())}`);
          if (result.source) {
            console.log(`  Source: ${chalk.gray(result.source)}`);
          }
          console.log("");
        }
      }
    } catch (error) {
      console.log(chalk.red(`Error searching memory: ${String(error)}`));
    }
    return;
  }

  if (subcommand === "stats") {
    try {
      const stats = await memoryStore.stats();
      console.log(chalk.cyanBright("Memory statistics:"));
      console.log(`Total keys: ${chalk.magenta(stats.totalKeys)}`);
      console.log(`Total size: ${chalk.magenta(stats.totalSize)}`);
      console.log(`Last updated: ${chalk.magenta(stats.lastUpdated)}`);
    } catch (error) {
      console.log(chalk.red(`Error getting memory stats: ${String(error)}`));
    }
    return;
  }

  console.log(chalk.yellow("Unknown memory command."));
  console.log(chalk.yellow("Available commands: list, get, set, delete, clear, search, stats"));
};

const startInteractiveCli = async () => {
  console.log(getBanner());
  console.log(chalk.gray("Type 'exit' to quit\n"));

  while (true) {
    const userInput = await ask("You: ");

    if (userInput.toLowerCase() === "exit") break;
    if (!userInput.trim()) continue;

    // 1. Planning
    const spinner = ora({ text: "Planning steps...", color: "magenta" }).start();
    let planResult: any = { plan: [] };

    try {
      planResult = await generatePlan(userInput);
      spinner.succeed("Planning complete");
    } catch (e) {
      spinner.fail("Planning failed");
      console.log(chalk.redBright("Error:"), e);
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
              color: "yellow",
            }).start();
          } else if (error) {
            // Step Crashed
            currentSpinner?.fail(
              `Step ${index + 1} crashed: ${chalk.redBright(error.message)}`,
            );
          } else if (!result?.success) {
            // Step Failed
            currentSpinner?.fail(
              `Step ${index + 1} failed: ${chalk.redBright(result?.result || result?.error || "Unknown error")}`,
            );
          } else {
            // Step Succeeded
            currentSpinner?.succeed(
              `Step ${index + 1} completed: ${chalk.green(String(result?.result || ""))}`,
            );
          }
        },
      );
    }

    // 3. Response
    const executionSummary: ExecutionSummary = {
      total_steps: steps.length,
      completed_steps: allResults.length,
      status: stopFlow ? "INTERRUPTED" : "SUCCESS",
      details: allResults,
    };

    if (DEBUG) {
      console.log(chalk.gray(JSON.stringify(executionSummary, null, 2)));
    }

    console.log(chalk.greenBright("\nYI Assistant:\n"));

    for await (const chunk of generateResponse(executionSummary, userInput)) {
      if (chunk) process.stdout.write(chalk.white(chunk));
    }

    console.log("\n" + chalk("—".repeat(50)) + "\n");

    // Clear State Buffer
    clearAIContext();
  }

  rl.close();
};

const main = async () => {
  const [, , command, ...args] = process.argv;
  if (command === "config") {
    handleConfigCommand(args);
    rl.close();
    return;
  }

  if (command === "mcp") {
    await handleMcpCommand(args);
    rl.close();
    return;
  }

  if (command === "skills") {
    await handleSkillsCommand(args);
    rl.close();
    return;
  }

  if (command === "memory") {
    await handleMemoryCommand(args);
    rl.close();
    return;
  }

  await startInteractiveCli();
};

main();
