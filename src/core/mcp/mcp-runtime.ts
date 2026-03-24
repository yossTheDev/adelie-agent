import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { listMcpServers } from "../config/mcp-config.js";

const getServer = (name: string) => {
  const server = listMcpServers().find((s) => s.name === name);
  if (!server) throw new Error(`MCP server '${name}' not found`);
  return server;
};

const withClient = async <T>(
  serverName: string,
  fn: (client: Client) => Promise<T>,
): Promise<T> => {
  const server = getServer(serverName);
  
  let transport: any;
  
  if (server.type === "http" && server.url) {
    // HTTP/HTTPS transport
    const headers: Record<string, string> = {};
    
    // Add auth headers if configured
    if (server.auth) {
      if (server.auth.type === "bearer" && server.auth.token) {
        headers["Authorization"] = `Bearer ${server.auth.token}`;
      } else if (server.auth.type === "basic" && server.auth.username && server.auth.password) {
        const credentials = Buffer.from(`${server.auth.username}:${server.auth.password}`).toString('base64');
        headers["Authorization"] = `Basic ${credentials}`;
      }
    }
    
    // Add custom headers
    if (server.headers) {
      Object.assign(headers, server.headers);
    }
    
    // Replace environment variables in URL
    const url = server.url.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
      return process.env[envVar] || match;
    });
    
    transport = new StreamableHTTPClientTransport(
      new URL(url),
      {
        requestInit: {
          headers
        }
      }
    );
  } else {
    // STDIO transport (default)
    if (!server.command) {
      throw new Error(`Server '${serverName}' missing command for STDIO transport`);
    }
    
    transport = new StdioClientTransport({
      command: server.command,
      args: server.args || [],
      env: Object.fromEntries(
        Object.entries({
          ...process.env,
          ...(server.env || {}),
        }).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>,
    });
  }

  const client = new Client(
    {
      name: "adelie",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  try {
    await client.connect(transport);
    return await fn(client);
  } finally {
    await client.close();
  }
};

export const listMcpTools = async (serverName: string): Promise<string[]> => {
  return withClient(serverName, async (client) => {
    const result = await client.listTools();
    return (result.tools || []).map((tool: any) => String(tool.name));
  });
};

export const callMcpTool = async (args: {
  server: string;
  tool: string;
  input?: unknown;
}): Promise<any> => {
  return withClient(args.server, async (client) => {
    const input =
      typeof args.input === "string"
        ? (() => {
            try {
              return JSON.parse(args.input);
            } catch {
              return { input: args.input };
            }
          })()
        : args.input || {};

    return client.callTool({
      name: args.tool,
      arguments: input as Record<string, unknown>,
    });
  });
};
