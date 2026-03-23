import fs from "node:fs";
import path from "node:path";
import { runPlan, resetExecutionContext } from "../src/core/executor/executor.js";

type PlanFile = {
  plan: Array<{ id: string; action: string; args?: Record<string, any> }>;
};

const FIXTURE_PATH = path.join(
  process.cwd(),
  "plan-tests",
  "for-each-documents-plan.json",
);

const TEMP_ROOT = path.join(process.cwd(), ".tmp-plan-tests", "Documents");

const remapPlanForSandbox = (input: PlanFile): PlanFile => {
  const sourcePrefix = "C:\\Users\\yoann\\Documents";
  const mapValue = (value: any): any => {
    if (typeof value === "string") {
      return value.replaceAll(sourcePrefix, TEMP_ROOT.replaceAll("/", "\\"));
    }
    if (Array.isArray(value)) return value.map(mapValue);
    if (value && typeof value === "object") {
      const mapped: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) mapped[k] = mapValue(v);
      return mapped;
    }
    return value;
  };

  return { plan: mapValue(input.plan) };
};

const main = async () => {
  fs.rmSync(path.join(process.cwd(), ".tmp-plan-tests"), {
    recursive: true,
    force: true,
  });

  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as PlanFile;
  const sandboxed = remapPlanForSandbox(parsed);

  const results = await runPlan(sandboxed.plan, false);
  const created = fs.existsSync(TEMP_ROOT)
    ? fs
        .readdirSync(TEMP_ROOT)
        .filter((f) => f.endsWith(".txt"))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    : [];

  const allOk =
    results.every((r) => r.success) &&
    created.length === 15 &&
    created[0] === "text-1.txt" &&
    created[14] === "text-15.txt" &&
    fs.readFileSync(path.join(TEMP_ROOT, "text-15.txt"), "utf-8") ===
      "This is text file number 15.";

  console.log(
    JSON.stringify(
      {
        ok: allOk,
        steps: sandboxed.plan.length,
        executed: results.length,
        createdCount: created.length,
        sample: created.slice(0, 3),
      },
      null,
      2,
    ),
  );

  resetExecutionContext();

  if (!allOk) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
