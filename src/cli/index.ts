import readline from "node:readline";
import chalk from "chalk";
import ora from "ora";
import { generateResponse } from "../core/response/response.js";
import { generatePlan } from "../core/planner/planner.js";
import { executeAction, runPlan } from "../core/executor/executor.js";
import type { ExecutionSummary } from "../core/response/types.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q: string) =>
  new Promise<string>((res) => rl.question(chalk.yellowBright.bold(q), res));

const DEBUG = false;

const main = async () => {
  console.log(chalk.cyanBright.bold("\nYI Agent (Multi-Step Mode) 🤖\n"));
  console.log(chalk.gray("Type 'exit' to quit\n"));

  while (true) {
    const userInput = await ask("You: ");

    if (userInput.toLowerCase() === "exit") break;
    if (!userInput.trim()) continue;

    // 1. Planning
    const spinner = ora({ text: "📑 Thinking...", color: "magenta" }).start();
    let planResult: any = { plan: [] };

    try {
      planResult = await generatePlan(userInput);
      spinner.succeed("✅ Planning complete");
    } catch (e) {
      spinner.fail("❌ Planning failed");
      console.log(chalk.redBright("Error:"), e);
      continue;
    }

    const steps = planResult || [];
    let allResults: any[] = [];
    let stopFlow = false;

    // Show plan
    if (steps.length > 0) {
      console.log(chalk.blueBright("\n📝 Execution Plan:\n"));
      steps.forEach((step: any, i: number) => {
        console.log(`${chalk.magenta(i + 1 + ".")} ${chalk.cyan(step.action)}`);
      });

      let currentSpinner: any = null;

      // 2. Execution via Orchestrator
      allResults = await runPlan(
        steps,
        false,
        (index, total, step, result, error) => {
          if (!result && !error) {
            // Step Starting
            currentSpinner = ora({
              text: `⏳ Step ${index + 1}/${total}: ${step.action}...`,
              color: "yellow",
            }).start();
          } else if (error) {
            // Step Crashed
            currentSpinner?.fail(
              `❌ Step ${index + 1} crashed: ${chalk.redBright(error.message)}`,
            );
          } else if (!result?.success) {
            // Step Failed
            currentSpinner?.fail(
              `❌ Step ${index + 1} failed: ${chalk.redBright(result?.result)}`,
            );
          } else {
            // Step Succeeded
            currentSpinner?.succeed(
              `✔ Step ${index + 1} completed: ${chalk.green(result?.result || "")}`,
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

    console.log(chalk.greenBright("\n💬 YI Assistant:\n"));

    for await (const chunk of generateResponse(executionSummary, userInput)) {
      if (chunk) process.stdout.write(chalk.white(chunk));
    }

    console.log("\n" + chalk("—".repeat(50)) + "\n");
  }

  rl.close();
};

main();
