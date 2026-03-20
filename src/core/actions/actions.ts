import { execSync } from "child_process";
import fs from "node:fs";
import path from "node:path";
import open from "open";

type ActionResult = [boolean, string];

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

export const listFiles = (dirPath: string = "."): ActionResult => {
  try {
    const files = fs.readdirSync(dirPath);
    return [true, files.slice(0, 50).join(", ")];
  } catch (e) {
    return [false, String(e)];
  }
};

export const readFile = (filePath: string): ActionResult => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return [true, content.slice(0, 2000)];
  } catch (e) {
    return [false, String(e)];
  }
};

export const writeFile = (filePath: string, content: string): ActionResult => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
    return [true, `File written at ${filePath}`];
  } catch (e) {
    return [false, String(e)];
  }
};

export const systemTime = (): ActionResult => {
  try {
    return [true, new Date().toISOString()];
  } catch (e) {
    return [false, String(e)];
  }
};

export const makeDirectory = (dirPath: string): ActionResult => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return [true, `Directory created or already exists at ${dirPath}`];
  } catch (e) {
    return [false, String(e)];
  }
};

export const deleteFile = (dirPath: string): ActionResult => {
  try {
    if (!fs.existsSync(dirPath))
      return [false, "File or directory does not exist"];
    fs.rmSync(dirPath, { recursive: true, force: true });
    return [true, `Deleted: ${dirPath}`];
  } catch (e) {
    return [false, String(e)];
  }
};

export const copyFile = (src: string, dest: string): ActionResult => {
  try {
    const srcPath = path.normalize(src.trim().replace(/"/g, ""));
    let destPath = path.normalize(dest.trim().replace(/"/g, ""));

    if (!fs.existsSync(srcPath))
      return [false, `Source file does not exist: ${src}`];

    const isDestFile = !!path.extname(destPath);
    const destFolder = isDestFile ? path.dirname(destPath) : destPath;

    if (!fs.existsSync(destFolder))
      fs.mkdirSync(destFolder, { recursive: true });

    const finalDest = isDestFile
      ? destPath
      : path.join(destFolder, path.basename(srcPath));

    fs.copyFileSync(srcPath, finalDest);
    return [true, `Copied ${src} to ${finalDest}`];
  } catch (e) {
    return [false, String(e)];
  }
};

export const moveFile = (src: string, dest: string): ActionResult => {
  try {
    fs.renameSync(src, dest);
    return [true, `Moved ${src} to ${dest}`];
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

export const ACTIONS: Record<
  string,
  (args: any) => ActionResult | Promise<ActionResult>
> = {
  BROWSER_OPEN: (args) => browserOpen(args.query || ""),
  LIST_FILES: (args) => listFiles(args.path || "."),
  READ_FILE: (args) => readFile(args.path || ""),
  WRITE_FILE: (args) => writeFile(args.path || "", args.content || ""),
  SYSTEM_TIME: () => systemTime(),
  MAKE_DIRECTORY: (args) => makeDirectory(args.path || ""),
  DELETE_FILE: (args) => deleteFile(args.path || ""),
  COPY_FILE: (args) => copyFile(args.src || "", args.dest || ""),
  MOVE_FILE: (args) => moveFile(args.src || "", args.dest || ""),
  PING_HOST: (args) => pingHost(args.host || ""),
};

export const ACTION_ARGS: Record<string, string[]> = {
  BROWSER_OPEN: ["query"],
  LIST_FILES: ["path"],
  READ_FILE: ["path"],
  WRITE_FILE: ["path", "content"],
  SYSTEM_TIME: [],
  MAKE_DIRECTORY: ["path"],
  DELETE_FILE: ["path"],
  COPY_FILE: ["src", "dest"],
  MOVE_FILE: ["src", "dest"],
  PING_HOST: ["host"],
};
