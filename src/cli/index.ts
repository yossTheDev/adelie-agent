import chalk from "chalk";
import readline from "node:readline";
import ora from "ora";
import boxen from "boxen";

import { runPlan } from "../core/executor/executor.js";
import { generatePlan } from "../core/planner/planner.js";
import { generateResponse } from "../core/response/response.js";
import type { ExecutionSummary } from "../core/response/types.js";
import { clearAIContext } from "../core/actions/state/state.js";
import { MODEL } from "../core/config.js";
import { ACTION_ARGS } from "../core/actions/actions.js";

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
    `${chalk.whiteBright("Model:")} ${chalk.greenBright(MODEL)}`,
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

const main = async () => {
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

main();
