import type { McpPreset, McpServer } from "../skills/skill-types.js";

export const MCP_PRESETS: Record<string, McpPreset> = {
  github: {
    name: "github",
    description: "GitHub integration for repository search, file access, and operations",
    servers: [
      {
        name: "github",
        command: "npx",
        args: ["-y", "@github/github-mcp-server"],
        env: {
          GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}"
        }
      }
    ]
  },
  
  "web-search": {
    name: "web-search",
    description: "Web search and content fetching capabilities",
    servers: [
      {
        name: "brave-search",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-brave-search"],
        env: {
          BRAVE_API_KEY: "${BRAVE_API_KEY}"
        }
      },
      {
        name: "fetch",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch"],
      }
    ]
  },

  docs: {
    name: "docs",
    description: "Technical documentation retrieval from various sources",
    servers: [
      {
        name: "puppeteer",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-puppeteer"],
      }
    ]
  },

  "file-index": {
    name: "file-index",
    description: "Semantic and local file search capabilities",
    servers: [
      {
        name: "filesystem",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "--", "/"],
      },
      {
        name: "sqlite",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-sqlite"],
      }
    ]
  },

  database: {
    name: "database",
    description: "Database connectivity for SQLite and PostgreSQL",
    servers: [
      {
        name: "sqlite",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-sqlite"],
      },
      {
        name: "postgres",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-postgres"],
      }
    ]
  },

  pdf: {
    name: "pdf",
    description: "PDF document parsing and text extraction",
    servers: [
      {
        name: "pdf-reader",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-pdf"],
      }
    ]
  },

  "shell-system": {
    name: "shell-system",
    description: "Controlled command execution and system operations",
    servers: [
      {
        name: "sequential-thinking",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      }
    ]
  },

  // Complete preset with all common tools
  complete: {
    name: "complete",
    description: "Complete MCP preset with all common tools for maximum functionality",
    servers: [
      {
        name: "github",
        command: "npx",
        args: ["-y", "@github/github-mcp-server"],
        env: {
          GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}"
        }
      },
      {
        name: "brave-search",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-brave-search"],
        env: {
          BRAVE_API_KEY: "${BRAVE_API_KEY}"
        }
      },
      {
        name: "fetch",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch"],
      },
      {
        name: "puppeteer",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-puppeteer"],
      },
      {
        name: "filesystem",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "--", "/"],
      },
      {
        name: "sqlite",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-sqlite"],
      },
      {
        name: "pdf-reader",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-pdf"],
      },
      {
        name: "sequential-thinking",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      }
    ]
  }
};

export function getPreset(name: string): McpPreset | undefined {
  return MCP_PRESETS[name];
}

export function getAllPresets(): McpPreset[] {
  return Object.values(MCP_PRESETS);
}

export function getPresetNames(): string[] {
  return Object.keys(MCP_PRESETS);
}

export function resolveEnvironmentVariables(env: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(env)) {
    if (value.startsWith("${") && value.endsWith("}")) {
      const envVar = value.slice(2, -1);
      const envValue = process.env[envVar];
      if (envValue) {
        resolved[key] = envValue;
      } else {
        console.warn(`Environment variable ${envVar} not found for ${key}`);
        resolved[key] = value; // Keep original if not found
      }
    } else {
      resolved[key] = value;
    }
  }
  
  return resolved;
}
