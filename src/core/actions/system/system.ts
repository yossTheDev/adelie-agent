// System Actions

import type { ActionResult } from "../../../types/action-result.js";
import fs from "node:fs";
import { execSync } from "child_process";
import { getSystemContext } from "../../context/get-system-context.js";

export const systemTime = (): ActionResult => {
  try {
    return [true, new Date().toISOString()];
  } catch (e) {
    return [false, String(e)];
  }
};

export const runScript = (
  scriptPath: string,
  args: string[] = [],
): ActionResult => {
  try {
    if (!fs.existsSync(scriptPath))
      return [false, "Script file does not exist"];
    const output = execSync(`"${scriptPath}" ${args.join(" ")}`, {
      encoding: "utf-8",
    });
    return [true, output.trim()];
  } catch (e) {
    return [false, String(e)];
  }
};

export const systemInfo = (): ActionResult => {
  try {
    return [true, JSON.stringify(getSystemContext())];
  } catch (e) {
    return [false, String(e)];
  }
};

export const ACTIONS: Record<
  string,
  (args: any) => ActionResult | Promise<ActionResult>
> = {
  SYSTEM_TIME: () => systemTime(),
  SYSTEM_INFO: () => systemInfo(),
  RUN_SCRIPT: (args) => runScript(args.path || "", args.args || []),
};

export const ACTION_ARGS: Record<string, string[]> = {
  SYSTEM_TIME: [],
  SYSTEM_INFO: [],
  RUN_SCRIPT: ["path", "args"],
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  SYSTEM_TIME: "Returns the current system date and time in ISO format.",
  SYSTEM_INFO:
    "Returns structured system information (user, OS, folders, network, env).",
  RUN_SCRIPT:
    "Executes a local script with optional arguments and returns its output.",
};
