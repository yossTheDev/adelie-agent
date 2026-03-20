import readline from "node:readline";
import { generateResponse } from "../core/response/response.js";
import { generatePlan } from "../core/planner/planner.js";
import { executeAction } from "../core/executor/executor.js";
import type { ExecutionSummary } from "../core/response/types.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q: string) => new Promise<string>((res) => rl.question(q, res));

const DEBUG = false;

const main = async () => {
  console.log("\nYI Agent (Multi-Step Mode) 🤖\n");
  console.log("Type 'exit' to quit\n");

  while (true) {
    const userInput = await ask("You: ");

    if (userInput.toLowerCase() === "exit") break;
    if (!userInput.trim()) continue;

    // 1. Planning
    let planResult: any = { plan: [] };
    process.stdout.write("\n📑 Thinking...\n");

    try {
      planResult = await generatePlan(userInput);
    } catch (e) {
      console.error("Planning error", e);
      continue;
    }

    const steps = planResult || [];

    let allResults: any[] = [];
    let stopFlow = false;

    // Show plan
    if (steps.length > 0) {
      console.log("\nExecution Plan:\n");

      steps.forEach((step: any, i: number) => {
        console.log(`${i + 1}. ${step.action} -> ${JSON.stringify(step.args)}`);
      });

      console.log("");

      // 2. Execution
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        process.stdout.write(
          `⏳ Step ${i + 1}/${steps.length}: ${step.action}...\n`,
        );

        try {
          const result = await executeAction(step);
          allResults.push(result);

          if (!result?.success) {
            console.log(`❌ Step ${i + 1} failed: ${result?.result}`);
            stopFlow = true;
            break;
          } else {
            console.log(`✔ Step ${i + 1} completed.`);
          }
        } catch (e: any) {
          console.log(`❌ Step ${i + 1} crashed: ${e.message}`);
          stopFlow = true;
          break;
        }
      }
    } else {
      allResults = [
        {
          action: "NONE",
          success: true,
          result: "Normal conversation context",
        },
      ];
    }

    // 3. Response
    const executionSummary: ExecutionSummary = {
      total_steps: steps.length,
      completed_steps: allResults.length,
      status: stopFlow ? "INTERRUPTED" : "SUCCESS",
      details: allResults,
    };

    console.log(executionSummary);

    if (DEBUG) {
      console.log(JSON.stringify(executionSummary, null, 2));
    }

    process.stdout.write("\nYI Assistant:\n\n");

    for await (const chunk of generateResponse(executionSummary, userInput)) {
      if (chunk) process.stdout.write(chunk);
    }

    console.log("\n" + "—".repeat(50) + "\n");
  }

  rl.close();
};

main();
