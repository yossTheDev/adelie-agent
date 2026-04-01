import ora from "ora";
import path from "node:path";
import os from "node:os";
import type { Command, CommandContext, CommandResult } from '../types/command.js';
import { McpInstaller } from "../../core/mcp/mcp-installer.js";
import {
  installMcpServer,
  updateMcpServerEnv,
} from "../../core/config/mcp-config.js";

const handleMcpList = async (): Promise<CommandResult> => {
  try {
    const servers = await McpInstaller.listInstalledServers();
    console.log("MCP servers:");
    
    if (servers.length === 0) {
      console.log("No MCP servers installed.");
    } else {
      for (const serverName of servers) {
        const serverInfo = await McpInstaller.getServerInfo(serverName);
        if (serverInfo) {
          console.log(
            `- ${serverName} -> ${`${serverInfo.command} ${(serverInfo.args || []).join(" ")}`.trim()}`,
          );
        }
      }
    }
    
    console.log(`Path: ${path.join(os.homedir(), ".adelie", "mcp-config.json")}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error listing MCP servers: ${String(error)}`
    };
  }
};

const handleMcpInstall = async (args: string[]): Promise<CommandResult> => {
  const [name, command, ...rawArgs] = args;
  
  if (!name || !command) {
    return {
      success: false,
      message: "Usage: adelie mcp install <name> <command> [args...] [--tools=tool1,tool2]"
    };
  }
  
  const toolFlag = rawArgs.find((a) => a.startsWith("--tools="));
  const commandArgs = rawArgs.filter((a) => !a.startsWith("--tools="));
  const tools = toolFlag
    ? toolFlag
      .replace("--tools=", "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    : [];

  try {
    const server = installMcpServer({ name, command, commandArgs, tools });
    console.log(`Installed MCP '${server.name}'.`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error installing MCP server: ${String(error)}`
    };
  }
};

const handleMcpInstallPreset = async (args: string[]): Promise<CommandResult> => {
  const [preset] = args;
  
  if (!preset) {
    return {
      success: false,
      message: "Usage: adelie mcp install-preset <preset-name>\nAvailable presets: github, web-search, docs, file-index, database, pdf, shell-system, complete"
    };
  }

  const spinner = ora(`Installing MCP preset '${preset}'...`).start();
  try {
    const result = await McpInstaller.installPreset(preset);
    if (result.success) {
      spinner.succeed(`MCP preset '${preset}' installed successfully.`);
      console.log("Note: Some MCP servers may require environment variables to be set.");
      return { success: true };
    } else {
      spinner.fail(`Installation failed: ${result.error}`);
      return {
        success: false,
        message: `Installation failed: ${result.error}`
      };
    }
  } catch (error) {
    spinner.fail(`Installation failed: ${String(error)}`);
    return {
      success: false,
      message: `Installation failed: ${String(error)}`
    };
  }
};

const handleMcpSetEnv = async (args: string[]): Promise<CommandResult> => {
  const [name, envKey, ...envValueParts] = args;
  const envValue = envValueParts.join(" ");
  
  if (!name || !envKey || !envValue) {
    return {
      success: false,
      message: "Usage: adelie mcp set-env <server> <ENV_KEY> <value>"
    };
  }
  
  try {
    const updated = updateMcpServerEnv(name, { [envKey]: envValue });
    if (!updated) {
      return {
        success: false,
        message: `MCP '${name}' was not found.`
      };
    }
    console.log(`Updated env '${envKey}' for MCP '${name}'.`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Error setting environment variable: ${String(error)}`
    };
  }
};

const handleMcpSyncTools = async (args: string[]): Promise<CommandResult> => {
  const [name] = args;
  
  if (!name) {
    return {
      success: false,
      message: "Usage: adelie mcp sync-tools <server>"
    };
  }
  
  try {
    const result = await McpInstaller.syncTools(name);
    if (result.success) {
      console.log(
        `✅ Synced tools for '${name}': ${result.tools ? result.tools.map(t => t.name).join(", ") || "(none)" : "(none)"}`,
      );
      return { success: true };
    } else {
      console.error(`❌ Failed to sync tools for '${name}': ${result.error}`);
      return {
        success: false,
        message: `Failed to sync tools: ${result.error}`
      };
    }
  } catch (error) {
    console.error(`❌ Error syncing tools: ${String(error)}`);
    return {
      success: false,
      message: `Error syncing tools: ${String(error)}`
    };
  }
};

const handleMcpStatus = async (): Promise<CommandResult> => {
  try {
    const status = await McpInstaller.getConnectionStatus();
    console.log("🔌 MCP Server Connection Status:");

    for (const [serverName, isConnected] of Object.entries(status)) {
      const statusIcon = isConnected ? "✅" : "❌";
      const statusText = isConnected ? "Connected" : "Disconnected";
      console.log(`  ${statusIcon} ${serverName}: ${statusText}`);
    }

    const connectedCount = Object.values(status).filter(Boolean).length;
    const totalCount = Object.keys(status).length;

    console.log(`\n📊 Summary: ${connectedCount}/${totalCount} servers connected`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error getting connection status: ${String(error)}`);
    return {
      success: false,
      message: `Error getting connection status: ${String(error)}`
    };
  }
};

const handleMcpDisconnect = async (): Promise<CommandResult> => {
  try {
    await McpInstaller.disconnectAll();
    console.log("🔌 Disconnected from all MCP servers");
    return { success: true };
  } catch (error) {
    console.error(`❌ Error disconnecting: ${String(error)}`);
    return {
      success: false,
      message: `Error disconnecting: ${String(error)}`
    };
  }
};

const handleMcpTest = async (args: string[]): Promise<CommandResult> => {
  const [name] = args;
  
  if (!name) {
    return {
      success: false,
      message: "Usage: adelie mcp test <server>"
    };
  }

  try {
    console.log(`🧪 Testing connection to MCP server: ${name}`);
    const tools = await McpInstaller.syncTools(name);

    if (tools.success) {
      console.log(`✅ Connection successful!`);
      console.log(`📋 Available tools: ${tools.tools ? tools.tools.length : 0}`);

      if (tools.tools && tools.tools.length > 0) {
        console.log("\nAvailable tools:");
        tools.tools.forEach(tool => {
          console.log(`  • ${tool.name}: ${tool.description || "No description"}`);
        });
      }
      return { success: true };
    } else {
      console.log(`❌ Connection failed: ${tools.error}`);
      return {
        success: false,
        message: `Connection failed: ${tools.error}`
      };
    }
  } catch (error) {
    console.error(`❌ Error testing connection: ${String(error)}`);
    return {
      success: false,
      message: `Error testing connection: ${String(error)}`
    };
  }
};

const handleMcpRemove = async (args: string[]): Promise<CommandResult> => {
  const [name] = args;
  
  if (!name) {
    return {
      success: false,
      message: "Usage: adelie mcp remove <name>"
    };
  }
  
  try {
    const result = await McpInstaller.removeServer(name);
    if (result.success) {
      console.log(`Removed MCP '${name}'.`);
      return { success: true };
    } else {
      console.log(`Failed to remove: ${result.error}`);
      return {
        success: false,
        message: `Failed to remove: ${result.error}`
      };
    }
  } catch (error) {
    console.log(`Error removing MCP: ${String(error)}`);
    return {
      success: false,
      message: `Error removing MCP: ${String(error)}`
    };
  }
};

const handleMcpPath = (): CommandResult => {
  console.log(path.join(os.homedir(), ".adelie", "mcp-config.json"));
  return { success: true };
};

export const mcpCommand: Command = {
  name: 'mcp',
  description: 'Manage MCP (Model Context Protocol) servers',
  usage: 'adelie mcp [subcommand] [options]',
  examples: [
    'adelie mcp list',
    'adelie mcp install-preset github',
    'adelie mcp test github',
    'adelie mcp status'
  ],
  subcommands: {
    list: {
      name: 'list',
      description: 'List installed MCP servers',
      usage: 'adelie mcp list',
      examples: ['adelie mcp list'],
      handler: () => handleMcpList()
    },
    install: {
      name: 'install',
      description: 'Install a custom MCP server',
      usage: 'adelie mcp install <name> <command> [args...] [--tools=tool1,tool2]',
      examples: ['adelie mcp install my-server npx server-command --tools=read,write'],
      handler: (context: CommandContext) => handleMcpInstall(context.args)
    },
    'install-preset': {
      name: 'install-preset',
      description: 'Install a preset MCP server',
      usage: 'adelie mcp install-preset <preset-name>',
      examples: ['adelie mcp install-preset github'],
      handler: (context: CommandContext) => handleMcpInstallPreset(context.args)
    },
    'set-env': {
      name: 'set-env',
      description: 'Set environment variables for MCP server',
      usage: 'adelie mcp set-env <server> <ENV_KEY> <value>',
      examples: ['adelie mcp set-env github GITHUB_TOKEN your-token'],
      handler: (context: CommandContext) => handleMcpSetEnv(context.args)
    },
    'sync-tools': {
      name: 'sync-tools',
      description: 'Sync tools from MCP server',
      usage: 'adelie mcp sync-tools <server>',
      examples: ['adelie mcp sync-tools github'],
      handler: (context: CommandContext) => handleMcpSyncTools(context.args)
    },
    status: {
      name: 'status',
      description: 'Show connection status of MCP servers',
      usage: 'adelie mcp status',
      examples: ['adelie mcp status'],
      handler: () => handleMcpStatus()
    },
    disconnect: {
      name: 'disconnect',
      description: 'Disconnect from all MCP servers',
      usage: 'adelie mcp disconnect',
      examples: ['adelie mcp disconnect'],
      handler: () => handleMcpDisconnect()
    },
    test: {
      name: 'test',
      description: 'Test connection to MCP server',
      usage: 'adelie mcp test <server>',
      examples: ['adelie mcp test github'],
      handler: (context: CommandContext) => handleMcpTest(context.args)
    },
    remove: {
      name: 'remove',
      description: 'Remove MCP server',
      usage: 'adelie mcp remove <name>',
      examples: ['adelie mcp remove github'],
      handler: (context: CommandContext) => handleMcpRemove(context.args)
    },
    path: {
      name: 'path',
      description: 'Show MCP configuration file path',
      usage: 'adelie mcp path',
      examples: ['adelie mcp path'],
      handler: () => handleMcpPath()
    }
  },
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const [subcommand, ...rest] = context.args;
    
    if (!subcommand || subcommand === "list") {
      return await handleMcpList();
    }
    
    if (subcommand === "install") {
      return await handleMcpInstall(rest);
    }
    
    if (subcommand === "install-preset") {
      return await handleMcpInstallPreset(rest);
    }
    
    if (subcommand === "set-env") {
      return await handleMcpSetEnv(rest);
    }
    
    if (subcommand === "sync-tools") {
      return await handleMcpSyncTools(rest);
    }
    
    if (subcommand === "status") {
      return await handleMcpStatus();
    }
    
    if (subcommand === "disconnect") {
      return await handleMcpDisconnect();
    }
    
    if (subcommand === "test") {
      return await handleMcpTest(rest);
    }
    
    if (subcommand === "remove") {
      return await handleMcpRemove(rest);
    }
    
    if (subcommand === "path") {
      return handleMcpPath();
    }
    
    return {
      success: false,
      message: "Unknown MCP command. Use 'adelie mcp --help' for available commands."
    };
  }
};
