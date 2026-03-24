// This file is auto-generated. Do not edit manually.
import * as ai from "./ai/ai.js";
import * as clipboard from "./clipboard/clipboard.js";
import * as fileSystem from "./file-system/file-system.js";
import * as logic from "./logic/logic.js";
import * as mcp from "./mcp/mcp.js";
import * as memory from "./memory/memory.js";
import * as network from "./network/network.js";
import * as skills from "./skills/skills.js";
import * as state from "./state/state.js";
import * as system from "./system/system.js";
import type { ActionResult } from "../../types/action-result.js";

export const ACTIONS: Record<string, (args: any) => Promise<ActionResult> | ActionResult> = {
  ...ai.ACTIONS,
  ...clipboard.ACTIONS,
  ...fileSystem.ACTIONS,
  ...logic.ACTIONS,
  ...mcp.ACTIONS,
  ...memory.ACTIONS,
  ...network.ACTIONS,
  ...skills.ACTIONS,
  ...state.ACTIONS,
  ...system.ACTIONS,
};

export const ACTION_ARGS: Record<string, string[]> = {
  ...ai.ACTION_ARGS,
  ...clipboard.ACTION_ARGS,
  ...fileSystem.ACTION_ARGS,
  ...logic.ACTION_ARGS,
  ...mcp.ACTION_ARGS,
  ...memory.ACTION_ARGS,
  ...network.ACTION_ARGS,
  ...skills.ACTION_ARGS,
  ...state.ACTION_ARGS,
  ...system.ACTION_ARGS,
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  ...ai.ACTION_DESCRIPTIONS,
  ...clipboard.ACTION_DESCRIPTIONS,
  ...fileSystem.ACTION_DESCRIPTIONS,
  ...logic.ACTION_DESCRIPTIONS,
  ...mcp.ACTION_DESCRIPTIONS,
  ...memory.ACTION_DESCRIPTIONS,
  ...network.ACTION_DESCRIPTIONS,
  ...skills.ACTION_DESCRIPTIONS,
  ...state.ACTION_DESCRIPTIONS,
  ...system.ACTION_DESCRIPTIONS,
};
