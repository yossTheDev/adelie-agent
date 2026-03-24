export interface SkillInput {
  name: string;
  description: string;
}

export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  tools?: string[];
  env?: Record<string, string>;
  package?: string;
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
  command: string;
  args: string[];
  env?: Record<string, string>;
}
