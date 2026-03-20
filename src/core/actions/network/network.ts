// Netword Actions

import open from "open";
import type { ActionResult } from "../../../types/action-result.js";
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export const browserOpen = async (query: string): Promise<ActionResult> => {
  try {
    const url = query.startsWith("http")
      ? query
      : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    await open(url);
    return [true, `Opened ${query}`];
  } catch (e) {
    return [false, String(e)];
  }
};

export const pingHost = (host: string): ActionResult => {
  try {
    // Note: ping command behavior varies between OS (Win: -n, Unix: -c)
    const param = process.platform === "win32" ? "-n" : "-c";
    const cleanHost = host.replace(/^https?:\/\//, "");
    const output = execSync(`ping ${param} 1 ${cleanHost}`).toString();
    return [true, output.trim()];
  } catch (e) {
    return [false, String(e)];
  }
};

export const downloadFile = async (
  url: string,
  dest: string,
): Promise<ActionResult> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return [false, `Failed to fetch: ${res.statusText}`];
    const buffer = Buffer.from(await res.arrayBuffer());
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dest, buffer);
    return [true, `Downloaded file to ${dest}`];
  } catch (e) {
    return [false, String(e)];
  }
};

export const ACTIONS: Record<
  string,
  (args: any) => ActionResult | Promise<ActionResult>
> = {
  BROWSER_OPEN: (args) => browserOpen(args.query || ""),
  PING_HOST: (args) => pingHost(args.host || ""),
  DOWNLOAD_FILE: (args) => downloadFile(args.url || "", args.dest || ""),
};

export const ACTION_ARGS: Record<string, string[]> = {
  BROWSER_OPEN: ["query"],
  PING_HOST: ["host"],
  DOWNLOAD_FILE: ["url", "dest"],
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  BROWSER_OPEN: "Opens a URL or performs a web search in the default browser.",
  PING_HOST: "Sends a single ping to a host to check network connectivity.",
  DOWNLOAD_FILE: "Downloads a file from a URL to a specified local path.",
};
