import os from "node:os";
import path from "node:path";

interface SystemContext {
  username: string;
  home_dir: string;
  folders: Record<string, string>;
  os: string;
  os_version: string;
  architecture: string;
  processor: string;
  language: string;
  encoding: string;
  current_datetime: string;
  current_date: string;
  current_time: string;
  hostname: string;
  ip_address: string;
  environment: Record<string, string | undefined>;
  error?: string;
}

export const getSystemContext = (): Partial<SystemContext> => {
  try {
    const now = new Date();
    const homeDir = os.homedir();
    const platform = os.platform();

    // Base folders
    const folders = {
      Documents: path.join(homeDir, "Documents"),
      Downloads: path.join(homeDir, "Downloads"),
      Desktop: path.join(homeDir, "Desktop"),
      Pictures: path.join(homeDir, "Pictures"),
      Music: path.join(homeDir, "Music"),
      Videos: path.join(homeDir, "Videos"),
    };

    const cpus = os.cpus();
    const processor = cpus.length > 0 ? cpus[0].model : "unknown";

    // Get IP Address
    let ipAddress = "unknown";
    const networks = os.networkInterfaces();
    for (const name of Object.keys(networks)) {
      for (const net of networks[name]!) {
        if (net.family === "IPv4" && !net.internal) {
          ipAddress = net.address;
          break;
        }
      }
    }

    return {
      username: os.userInfo().username,
      home_dir: homeDir,
      folders,
      os: platform,
      os_version: os.release(),
      architecture: os.arch(),
      processor: processor,
      language: process.env.LANG || "unknown",
      encoding: "utf-8",
      current_datetime: now.toISOString(),
      current_date: now.toISOString().split("T")[0],
      current_time: now.toTimeString().split(" ")[0],
      hostname: os.hostname(),
      ip_address: ipAddress,
      environment: {
        PATH: process.env.PATH,
        USERPROFILE: process.env.USERPROFILE,
        TEMP: process.env.TEMP,
      },
    };
  } catch (e) {
    return { error: String(e) };
  }
};

export const getSystemContextAsRules = (): string => {
  const ctx = getSystemContext();

  if (ctx.error) {
    return `Could not get system context: ${ctx.error}`;
  }

  const folderRules = Object.entries(ctx.folders || {})
    .map(([name, path]) => `  ${name}: ${path}`)
    .join("\n");

  return `
Username: ${ctx.username}
Home directory: ${ctx.home_dir}
User folders:
${folderRules}
OS: ${ctx.os} ${ctx.os_version} (${ctx.architecture})
Processor: ${ctx.processor}
Language: ${ctx.language} (encoding: ${ctx.encoding})
Current date/time: ${ctx.current_date} ${ctx.current_time}
Hostname: ${ctx.hostname}
IP address: ${ctx.ip_address}
Important environment variables: ${JSON.stringify(ctx.environment)}
`.trim();
};
