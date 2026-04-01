export interface CommandContext {
  args: string[];
  options: Record<string, any>;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
}

export interface Command {
  name: string;
  description: string;
  usage: string;
  examples: string[];
  subcommands?: Record<string, Command>;
  handler: (context: CommandContext) => Promise<CommandResult> | CommandResult;
}

export interface CommandRegistry {
  register(command: Command): void;
  get(name: string): Command | undefined;
  list(): Command[];
  showHelp(commandName?: string): void;
}
