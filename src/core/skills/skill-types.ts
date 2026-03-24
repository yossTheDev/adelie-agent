export interface SkillInput {
  name: string;
  description: string;
  type?: string;
  required?: boolean;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  usage?: string;
  examples?: Array<{
    input: any;
    description: string;
  }>;
}

export interface McpServerConfig {
  name: string;
  command?: string;
  args?: string[];
  tools?: McpToolDefinition[] | string[];
  env?: Record<string, string>;
  package?: string;
  description?: string;
  // HTTP/HTTPS transport configuration
  type?: "stdio" | "http";
  url?: string;
  headers?: Record<string, string>;
  auth?: {
    type?: "bearer" | "basic";
    token?: string;
    username?: string;
    password?: string;
  };
}

export interface Skill {
  name: string;
  description: string;
  whenToUse: string[];
  inputs: SkillInput[];
  planTemplate: any[];
  example: string;
  expectedBehavior: string;
  mcpServer?: string;
  mcpServerConfig?: McpServerConfig;
  mcpTools?: McpToolDefinition[];
  version?: string;
  author?: string;
  tags?: string[];
}

export interface SkillParseResult {
  success: boolean;
  skill?: Skill;
  error?: string;
}

export interface McpPreset {
  name: string;
  description: string;
  servers: McpServerConfig[];
}

export interface McpServer {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: "stdio" | "http";
  url?: string;
  headers?: Record<string, string>;
  auth?: {
    type?: "bearer" | "basic";
    token?: string;
    username?: string;
    password?: string;
  };
}
