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
} from "../core/config/mcp-config.js";

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

const handleMcpCommand = (args: string[]) => {
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
    handleMcpCommand(args);
    rl.close();
    return;
  }

  await startInteractiveCli();
};

main();
