// File System Actions

import fs from "node:fs";
import path from "node:path";
import type { ActionResult } from "../../../types/action-result.js";

export const listFiles = (dirPath: string = "."): ActionResult => {
  try {
    if (!fs.existsSync(dirPath)) return [false, "Directory does not exist"];

    const files = fs.readdirSync(dirPath);

    const fullPaths = files
      .slice(0, 50)
      .map((file) => path.join(dirPath, file));

    return [true, fullPaths.join(", ")];
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

    if (!fs.existsSync(destPath)) makeDirectory(destPath);

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
    if (!fs.existsSync(src))
      return [false, `Source file does not exist: ${src}`];

    if (!fs.existsSync(dest)) makeDirectory(dest);

    fs.renameSync(src, dest);
    return [true, `Moved ${src} to ${dest}`];
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

export const filterFiles = (
  dirPath: string = ".",
  pattern: string = "",
): ActionResult => {
  try {
    if (!fs.existsSync(dirPath)) return [false, "Directory does not exist"];

    const files = fs.readdirSync(dirPath);
    const regex = new RegExp(pattern, "i");

    const matchedFiles = files
      .filter((file) => regex.test(file))
      .map((file) => path.join(dirPath, file));

    if (matchedFiles.length === 0) {
      return [true, "No files matched the pattern"];
    }

    return [true, matchedFiles.join(", ")];
  } catch (e) {
    return [false, String(e)];
  }
};
/**
 * Utility to parse a comma-separated string or an array of files.
 * This is crucial for data piping from FILTER_FILES.
 */
const parseFileList = (input: any): string[] => {
  if (Array.isArray(input)) return input;
  if (typeof input === "string")
    return input
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  return [];
};

export const deleteFiles = (filesInput: any): ActionResult => {
  try {
    const files = parseFileList(filesInput);
    if (files.length === 0) return [false, "No files provided to delete"];

    let deletedCount = 0;
    files.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.rmSync(file, { recursive: true, force: true });
        deletedCount++;
      }
    });

    return [
      true,
      `Successfully deleted ${deletedCount} of ${files.length} files` +
        (deletedCount < files.length ? " (some files were not found)" : ""),
    ];
  } catch (e) {
    return [false, String(e)];
  }
};

export const copyFiles = (filesInput: any, dest: string): ActionResult => {
  try {
    const files = parseFileList(filesInput);
    if (files.length === 0) return [false, "No files provided to copy"];
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    let copiedCount = 0;
    files.forEach((file) => {
      if (fs.existsSync(file)) {
        const fileName = path.basename(file);
        fs.copyFileSync(file, path.join(dest, fileName));
        copiedCount++;
      }
    });

    return [true, `Copied ${copiedCount} files to ${dest}`];
  } catch (e) {
    return [false, String(e)];
  }
};

export const moveFiles = (filesInput: any, dest: string): ActionResult => {
  try {
    const files = parseFileList(filesInput);
    if (files.length === 0) return [false, "No files provided to move"];
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    let movedCount = 0;
    files.forEach((file) => {
      if (fs.existsSync(file)) {
        const fileName = path.basename(file);
        fs.renameSync(file, path.join(dest, fileName));
        movedCount++;
      }
    });

    return [true, `Moved ${movedCount} files to ${dest}`];
  } catch (e) {
    return [false, String(e)];
  }
};

export const ACTIONS: Record<
  string,
  (args: any) => ActionResult | Promise<ActionResult>
> = {
  LIST_FILES: (args) => listFiles(args.path || "."),
  READ_FILE: (args) => readFile(args.path || ""),
  WRITE_FILE: (args) => writeFile(args.path || "", args.content || ""),
  MAKE_DIRECTORY: (args) => makeDirectory(args.path || ""),
  DELETE_FILE: (args) => deleteFile(args.path || ""),
  COPY_FILE: (args) => copyFile(args.src || "", args.dest || ""),
  MOVE_FILE: (args) => moveFile(args.src || "", args.dest || ""),
  DELETE_DIRECTORY: (args) => deleteDirectory(args.path || ""),
  RENAME_FILE: (args) => renameFileOrDirectory(args.src || "", args.dest || ""),
  RENAME_DIRECTORY: (args) =>
    renameFileOrDirectory(args.src || "", args.dest || ""),
  GET_FILE_STATS: (args) => getFileStats(args.path || ""),
  GET_DIRECTORY_STATS: (args) => getDirectoryStats(args.path || ""),
  FILTER_FILES: (args) => filterFiles(args.path || ".", args.pattern || ""),
  DELETE_FILES: (args) => deleteFiles(args.files || ""),
  COPY_FILES: (args) => copyFiles(args.files || "", args.dest || ""),
  MOVE_FILES: (args) => moveFiles(args.files || "", args.dest || ""),
};

export const ACTION_ARGS: Record<string, string[]> = {
  LIST_FILES: ["path"],
  READ_FILE: ["path"],
  WRITE_FILE: ["path", "content"],
  MAKE_DIRECTORY: ["path"],
  DELETE_FILE: ["path"],
  COPY_FILE: ["src", "dest"],
  MOVE_FILE: ["src", "dest"],
  DELETE_DIRECTORY: ["path"],
  RENAME_FILE: ["src", "dest"],
  RENAME_DIRECTORY: ["src", "dest"],
  GET_FILE_STATS: ["path"],
  GET_DIRECTORY_STATS: ["path"],
  FILTER_FILES: ["path", "pattern"],
  DELETE_FILES: ["files"],
  COPY_FILES: ["files", "dest"],
  MOVE_FILES: ["files", "dest"],
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  LIST_FILES: "Lists up to 50 files in a specified directory.",
  READ_FILE: "Reads the content of a file, returning up to 2000 characters.",
  WRITE_FILE: "Writes content to a file, creating directories if necessary.",
  MAKE_DIRECTORY:
    "Creates a directory, including any missing parent directories.",
  DELETE_FILE: "Deletes a file or directory safely, with force if needed.",
  COPY_FILE: "Copies a file from a source path to a destination path.",
  MOVE_FILE: "Moves a file from a source path to a destination path.",
  DELETE_DIRECTORY: "Deletes a directory and all its contents recursively.",
  RENAME_FILE: "Renames a file from its current path to a new path.",
  RENAME_DIRECTORY: "Renames a directory from its current path to a new path.",
  GET_FILE_STATS:
    "Retrieves metadata of a file including size, dates, and type.",
  GET_DIRECTORY_STATS:
    "Retrieves metadata of a directory including file count, total size, and latest modification.",
  FILTER_FILES:
    "Filters files in a directory using a regex pattern. Returns a comma-separated list of matches.",
  DELETE_FILES:
    "Deletes multiple files. Accepts a comma-separated string or an array.",
  COPY_FILES:
    "Copies multiple files to a destination directory. Accepts a comma-separated string or an array.",
  MOVE_FILES:
    "Moves multiple files to a destination directory. Accepts a comma-separated string or an array.",
};
