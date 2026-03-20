import { execSync } from "child_process";
import fs from "node:fs";
import path from "node:path";
import open from "open";
import clipboardy from "clipboardy";

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

export const deleteDirectory = (dirPath: string): ActionResult => {
  try {
    if (!fs.existsSync(dirPath)) return [false, "Directory does not exist"];
    fs.rmSync(dirPath, { recursive: true, force: true });
    return [true, `Deleted directory: ${dirPath}`];
  } catch (e) {
    return [false, String(e)];
  }
};

export const renameFileOrDirectory = (
  src: string,
  dest: string,
): ActionResult => {
  try {
    if (!fs.existsSync(src)) return [false, "Source does not exist"];
    fs.renameSync(src, dest);
    return [true, `Renamed ${src} to ${dest}`];
  } catch (e) {
    return [false, String(e)];
  }
};

export const getFileStats = (filePath: string): ActionResult => {
  try {
    if (!fs.existsSync(filePath)) return [false, "File does not exist"];
    const stats = fs.statSync(filePath);
    return [
      true,
      JSON.stringify({
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      }),
    ];
  } catch (e) {
    return [false, String(e)];
  }
};

export const getDirectoryStats = (dirPath: string): ActionResult => {
  try {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory())
      return [false, "Directory does not exist"];
    const files = fs.readdirSync(dirPath);
    let totalSize = 0;
    let latestModified = 0;
    files.forEach((file) => {
      const fStats = fs.statSync(path.join(dirPath, file));
      totalSize += fStats.size;
      if (fStats.mtimeMs > latestModified) latestModified = fStats.mtimeMs;
    });
    return [
      true,
      JSON.stringify({
        totalFiles: files.length,
        totalSize,
        latestModified: new Date(latestModified),
      }),
    ];
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

export const clipboardCopy = (text: string): ActionResult => {
  try {
    clipboardy.writeSync(text);
    return [true, "Copied to clipboard"];
  } catch (e) {
    return [false, String(e)];
  }
};

export const getClipboardText = (): ActionResult => {
  try {
    const text = clipboardy.readSync();
    return [true, text];
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
  DELETE_DIRECTORY: (args) => deleteDirectory(args.path || ""),
  RENAME_FILE: (args) => renameFileOrDirectory(args.src || "", args.dest || ""),
  RENAME_DIRECTORY: (args) =>
    renameFileOrDirectory(args.src || "", args.dest || ""),
  GET_FILE_STATS: (args) => getFileStats(args.path || ""),
  GET_DIRECTORY_STATS: (args) => getDirectoryStats(args.path || ""),
  DOWNLOAD_FILE: (args) => downloadFile(args.url || "", args.dest || ""),
  CLIPBOARD_COPY: (args) => clipboardCopy(args.text || ""),
  CLIPBOARD_PASTE: () => getClipboardText(),
  GET_CLIPBOARD_TEXT: () => getClipboardText(),
  RUN_SCRIPT: (args) => runScript(args.path || "", args.args || []),
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
  DELETE_DIRECTORY: ["path"],
  RENAME_FILE: ["src", "dest"],
  RENAME_DIRECTORY: ["src", "dest"],
  GET_FILE_STATS: ["path"],
  GET_DIRECTORY_STATS: ["path"],
  DOWNLOAD_FILE: ["url", "dest"],
  CLIPBOARD_COPY: ["text"],
  CLIPBOARD_PASTE: [],
  GET_CLIPBOARD_TEXT: [],
  RUN_SCRIPT: ["path", "args"],
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  BROWSER_OPEN: "Opens a URL or performs a web search in the default browser.",
  LIST_FILES: "Lists up to 50 files in a specified directory.",
  READ_FILE: "Reads the content of a file, returning up to 2000 characters.",
  WRITE_FILE: "Writes content to a file, creating directories if necessary.",
  SYSTEM_TIME: "Returns the current system date and time in ISO format.",
  MAKE_DIRECTORY:
    "Creates a directory, including any missing parent directories.",
  DELETE_FILE: "Deletes a file or directory safely, with force if needed.",
  COPY_FILE: "Copies a file from a source path to a destination path.",
  MOVE_FILE: "Moves a file from a source path to a destination path.",
  PING_HOST: "Sends a single ping to a host to check network connectivity.",
  DELETE_DIRECTORY: "Deletes a directory and all its contents recursively.",
  RENAME_FILE: "Renames a file from its current path to a new path.",
  RENAME_DIRECTORY: "Renames a directory from its current path to a new path.",
  GET_FILE_STATS:
    "Retrieves metadata of a file including size, dates, and type.",
  GET_DIRECTORY_STATS:
    "Retrieves metadata of a directory including file count, total size, and latest modification.",
  DOWNLOAD_FILE: "Downloads a file from a URL to a specified local path.",
  CLIPBOARD_COPY: "Copies provided text to the system clipboard.",
  CLIPBOARD_PASTE:
    "Pastes or returns the current text from the system clipboard.",
  GET_CLIPBOARD_TEXT:
    "Returns the current text stored in the system clipboard.",
  RUN_SCRIPT:
    "Executes a local script with optional arguments and returns its output.",
};
