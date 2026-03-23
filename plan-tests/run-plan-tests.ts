import fs from "node:fs";
import path from "node:path";
import { runPlan, resetExecutionContext } from "../src/core/executor/executor.js";

type PlanFile = {
  name?: string;
  plan: Array<{ id: string; action: string; args?: Record<string, any> }>;
};

const FIXTURES_DIR = path.join(process.cwd(), "plan-tests", "fixtures");
const TEMP_ROOT = path.join(process.cwd(), ".tmp-plan-tests");

const remapPlanForSandbox = (input: PlanFile): PlanFile => {
  const sourcePrefix = "__ROOT__";
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

const assertFixture = (fixturePath: string): { ok: boolean; reason: string } => {
  const baseName = path.basename(fixturePath);
  const docsDir = path.join(TEMP_ROOT, "docs");
  const logicDir = path.join(TEMP_ROOT, "logic");
  const stateDir = path.join(TEMP_ROOT, "state");

  if (baseName.startsWith("01-")) {
    const created = fs.existsSync(docsDir)
      ? fs
          .readdirSync(docsDir)
          .filter((f) => f.endsWith(".txt"))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      : [];
    const ok =
      created.length === 15 &&
      created[0] === "text-1.txt" &&
      created[14] === "text-15.txt" &&
      fs.readFileSync(path.join(docsDir, "text-15.txt"), "utf-8") ===
        "This is text file number 15.";
    return { ok, reason: ok ? "created 15 files from FOR_EACH" : "FOR_EACH output mismatch" };
  }

  if (baseName.startsWith("02-")) {
    const ifPass = path.join(logicDir, "if-pass.txt");
    const ifFail = path.join(logicDir, "if-fail.txt");
    const ok = fs.existsSync(ifPass) && !fs.existsSync(ifFail);
    return { ok, reason: ok ? "IF gate chose then branch" : "IF deterministic gate failed" };
  }

  if (baseName.startsWith("03-")) {
    const forbidden = path.join(logicDir, "while-created.txt");
    const ok = !fs.existsSync(forbidden);
    return { ok, reason: ok ? "WHILE false condition skipped body" : "WHILE executed unexpectedly" };
  }

  if (baseName.startsWith("04-")) {
    const proof = path.join(stateDir, "ok.txt");
    const ok = fs.existsSync(proof);
    return { ok, reason: ok ? "state actions produced expected condition" : "state actions failed" };
  }

  return { ok: true, reason: "no explicit assertion" };
};

const main = async () => {
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
  fs.mkdirSync(TEMP_ROOT, { recursive: true });

  const fixturePaths = fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => path.join(FIXTURES_DIR, f));

  const report: Array<Record<string, any>> = [];
  let allOk = true;

  for (const fixturePath of fixturePaths) {
    const raw = fs.readFileSync(fixturePath, "utf-8");
    const parsed = JSON.parse(raw) as PlanFile;
    const sandboxed = remapPlanForSandbox(parsed);

    const results = await runPlan(sandboxed.plan, false);
    const actionOk = results.every((r) => r.success);
    const assertion = assertFixture(fixturePath);
    const ok = actionOk && assertion.ok;
    allOk = allOk && ok;

    report.push({
      fixture: path.basename(fixturePath),
      name: parsed.name || "",
      ok,
      executed: results.length,
      steps: sandboxed.plan.length,
      reason: assertion.reason,
    });

    resetExecutionContext();
  }

  console.log(JSON.stringify({ ok: allOk, total: report.length, report }, null, 2));

  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });

  if (!allOk) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
