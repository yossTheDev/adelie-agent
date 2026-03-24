import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServer } from "../skills/skill-types.js";
import { listMcpServers } from "../config/mcp-config.js";

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export class McpClientManager {
  private static clients: Map<string, Client> = new Map();
  private static transports: Map<string, any> = new Map(); // Using any for both transport types

  /**
   * Connect to an MCP server and return the client
   */
  static async connectToServer(serverName: string): Promise<Client | null> {
    try {
      // Check if already connected
      if (this.clients.has(serverName)) {
        return this.clients.get(serverName)!;
      }

      // Get server configuration
      const servers = listMcpServers();
      const serverConfig = servers.find(s => s.name === serverName);
      
      if (!serverConfig) {
        console.error(`Server '${serverName}' not found in configuration`);
        return null;
      }

      // Create transport based on type
      let transport: any;
      
      if (serverConfig.type === "http" && serverConfig.url) {
        // HTTP/HTTPS transport
        const headers: Record<string, string> = {};
        
        // Add auth headers if configured
        if (serverConfig.auth) {
          if (serverConfig.auth.type === "bearer" && serverConfig.auth.token) {
            headers["Authorization"] = `Bearer ${serverConfig.auth.token}`;
          } else if (serverConfig.auth.type === "basic" && serverConfig.auth.username && serverConfig.auth.password) {
            const credentials = Buffer.from(`${serverConfig.auth.username}:${serverConfig.auth.password}`).toString('base64');
            headers["Authorization"] = `Basic ${credentials}`;
          }
        }
        
        // Add custom headers
        if (serverConfig.headers) {
          Object.assign(headers, serverConfig.headers);
        }
        
        // Replace environment variables in URL
        const url = serverConfig.url.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
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
        if (!serverConfig.command) {
          console.error(`Server '${serverName}' missing command for STDIO transport`);
          return null;
        }
        
        transport = new StdioClientTransport({
          command: serverConfig.command,
          args: serverConfig.args || [],
          env: Object.fromEntries(
            Object.entries({
              ...process.env,
              ...(serverConfig.env || {})
            }).filter(([_, value]) => value !== undefined)
          ) as Record<string, string>
        });
      }

      // Create and connect client
      const client = new Client(
        {
          name: "yi-agent",
          version: "1.0.0"
        },
        {
          capabilities: {}
        }
      );

      await client.connect(transport);

      // Store references
      this.clients.set(serverName, client);
      this.transports.set(serverName, transport);

      console.log(`✅ Connected to MCP server: ${serverName} (${serverConfig.type || "stdio"})`);
      return client;
    } catch (error) {
      console.error(`Failed to connect to MCP server '${serverName}':`, error);
      return null;
    }
  }

  /**
   * Get list of tools from an MCP server
   */
  static async getServerTools(serverName: string): Promise<McpTool[]> {
    try {
      const client = await this.connectToServer(serverName);
      if (!client) {
        return [];
      }

      const result = await client.listTools();
      
      return result.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
    } catch (error) {
      console.error(`Failed to get tools from server '${serverName}':`, error);
      return [];
    }
  }

  /**
   * Execute a tool on an MCP server
   */
  static async executeTool(
    serverName: string,
    toolName: string,
    args: any = {}
  ): Promise<any> {
    try {
      const client = await this.connectToServer(serverName);
      if (!client) {
        throw new Error(`Could not connect to server: ${serverName}`);
      }

      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

      return result.content;
    } catch (error) {
      console.error(`Failed to execute tool '${toolName}' on server '${serverName}':`, error);
      throw error;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  static async disconnectFromServer(serverName: string): Promise<void> {
    try {
      const transport = this.transports.get(serverName);
      if (transport) {
        await transport.close();
        this.transports.delete(serverName);
      }

      this.clients.delete(serverName);
      console.log(`🔌 Disconnected from MCP server: ${serverName}`);
    } catch (error) {
      console.error(`Failed to disconnect from server '${serverName}':`, error);
    }
  }

  /**
   * Disconnect from all MCP servers
   */
  static async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.clients.keys());
    await Promise.all(serverNames.map(name => this.disconnectFromServer(name)));
  }

  /**
   * Check if connected to a server
   */
  static isConnected(serverName: string): boolean {
    return this.clients.has(serverName);
  }

  /**
   * Get list of connected servers
   */
  static getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }
}
