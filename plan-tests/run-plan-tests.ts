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

  if (baseName.startsWith("05-")) {
    const successFile = path.join(TEMP_ROOT, "datapiping", "success.txt");
    const userProfile = path.join(TEMP_ROOT, "datapiping", "user-profile.txt");
    const ok = fs.existsSync(successFile) && fs.existsSync(userProfile);
    const content = ok ? fs.readFileSync(successFile, "utf-8") : "";
    const containsReference = content.includes("DataPiping test passed");
    return { ok: ok && containsReference, reason: ok && containsReference ? "complex DataPiping with $$id references works" : "complex DataPiping failed" };
  }

  if (baseName.startsWith("06-")) {
    const resultFile = path.join(TEMP_ROOT, "nested", "result.txt");
    const ok = fs.existsSync(resultFile);
    const content = ok ? fs.readFileSync(resultFile, "utf-8") : "";
    const containsAllItems = content.includes("apple") && content.includes("banana") && content.includes("cherry");
    return { ok: ok && containsAllItems, reason: ok && containsAllItems ? "nested DataPiping with loops works" : "nested DataPiping failed" };
  }

  if (baseName.startsWith("07-")) {
    const reportFile = path.join(TEMP_ROOT, "state", "state-report.txt");
    const ok = fs.existsSync(reportFile);
    const content = ok ? fs.readFileSync(reportFile, "utf-8") : "";
    const containsSecondBuffer = content.includes("second_value");
    const containsClearedCheck = content.includes("First buffer cleared: TRUE");
    return { ok: ok && containsSecondBuffer && containsClearedCheck, reason: ok && containsSecondBuffer && containsClearedCheck ? "comprehensive state functions work" : "comprehensive state functions failed" };
  }

  if (baseName.startsWith("08-")) {
    const finalSuccess = path.join(TEMP_ROOT, "edge", "final-success.txt");
    const ok = fs.existsSync(finalSuccess);
    const content = ok ? fs.readFileSync(finalSuccess, "utf-8") : "";
    const containsExistingRef = content.includes("test_value");
    const containsNonExistingRef = content.includes("$$nonexistent");
    return { ok: ok && containsExistingRef && containsNonExistingRef, reason: ok && containsExistingRef && containsNonExistingRef ? "DataPiping edge cases handled correctly" : "DataPiping edge cases failed" };
  }

  if (baseName.startsWith("09-")) {
    const resultFile = path.join(TEMP_ROOT, "state", "result.txt");
    const ok = fs.existsSync(resultFile);
    const content = ok ? fs.readFileSync(resultFile, "utf-8") : "";
    const containsActualContent = content.includes("Hello from file 1") && content.includes("Hello from file 2");
    const containsLiteralReference = content.includes("$$r1");
    return { ok: ok && containsActualContent && !containsLiteralReference, reason: ok && containsActualContent && !containsLiteralReference ? "STATE functions inside FOR_EACH work correctly" : "STATE functions inside FOR_EACH failed - contains literal $$r1 reference" };
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
