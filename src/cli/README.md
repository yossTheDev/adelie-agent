# CLI Modular Command System

This directory contains the modular command system for the Adelie CLI. The system is designed to be extensible, organized, and easy to maintain.

## Structure

```
src/cli/
├── index.ts                 # Main CLI entry point
├── types/
│   └── command.ts          # Command interfaces and types
├── core/
│   ├── command-registry.ts # Command registration and management
│   ├── command-loader.ts   # Loads and registers all commands
│   └── command-parser.ts   # Argument parsing and command execution
└── commands/
    ├── config.ts           # Configuration management commands
    ├── mcp.ts              # MCP server management commands
    ├── skills.ts           # Skills management commands
    ├── memory.ts           # Memory management commands
    ├── conversation.ts     # Conversation history commands
    └── run.ts              # Existing run command (legacy)
```

## Adding New Commands

### 1. Create Command File

Create a new file in `src/cli/commands/` for your command:

```typescript
// src/cli/commands/my-command.ts
import type { Command, CommandContext, CommandResult } from '../types/command.js';

export const myCommand: Command = {
  name: 'my-command',
  description: 'Description of what this command does',
  usage: 'adelie my-command [subcommand] [options]',
  examples: [
    'adelie my-command list',
    'adelie my-command create --name "example"'
  ],
  subcommands: {
    // Optional: define subcommands
    list: {
      name: 'list',
      description: 'List items',
      usage: 'adelie my-command list',
      examples: ['adelie my-command list'],
      handler: () => handleList()
    }
  },
  handler: async (context: CommandContext): Promise<CommandResult> => {
    const [subcommand, ...rest] = context.args;
    
    // Handle command logic here
    return { success: true, message: "Command executed successfully" };
  }
};
```

### 2. Register Command

Add your command to `src/cli/core/command-loader.ts`:

```typescript
import { myCommand } from '../commands/my-command.js';

export const loadCommands = (): void => {
  // Existing commands...
  commandRegistry.register(myCommand);
};
```

### 3. Command Interface

All commands must implement the `Command` interface:

```typescript
interface Command {
  name: string;                    // Command name
  description: string;             // Human-readable description
  usage: string;                   // Usage syntax
  examples: string[];              // Example usage
  subcommands?: Record<string, Command>; // Optional subcommands
  handler: (context: CommandContext) => CommandResult | Promise<CommandResult>;
}
```

### 4. Command Context

The handler receives a `CommandContext` object:

```typescript
interface CommandContext {
  args: string[];                  // Command arguments
  options: Record<string, any>;    // Parsed options
}
```

### 5. Command Result

Commands should return a `CommandResult`:

```typescript
interface CommandResult {
  success: boolean;                // Whether command succeeded
  message?: string;                // Optional message to display
  data?: any;                      // Optional data to return
}
```

## Command Features

### Help System

Commands automatically get help support:
- `adelie --help` shows general help
- `adelie my-command --help` shows command-specific help
- Help includes description, usage, examples, and subcommands

### Subcommands

Commands can have nested subcommands with their own handlers and help.

### Error Handling

Commands should return appropriate error messages in the `CommandResult`.

### Async Support

Command handlers can be async for operations that require I/O.

## Examples

### Simple Command

```typescript
export const helloCommand: Command = {
  name: 'hello',
  description: 'Say hello',
  usage: 'adelie hello [name]',
  examples: ['adelie hello', 'adelie hello World'],
  handler: (context: CommandContext): CommandResult => {
    const name = context.args[0] || 'World';
    console.log(`Hello, ${name}!`);
    return { success: true };
  }
};
```

### Command with Subcommands

```typescript
export const fileCommand: Command = {
  name: 'file',
  description: 'File operations',
  usage: 'adelie file [subcommand] [path]',
  examples: ['adelie file read ./example.txt', 'adelie file list'],
  subcommands: {
    read: {
      name: 'read',
      description: 'Read file contents',
      usage: 'adelie file read <path>',
      examples: ['adelie file read ./example.txt'],
      handler: (context: CommandContext) => handleRead(context.args)
    },
    list: {
      name: 'list',
      description: 'List directory contents',
      usage: 'adelie file list [path]',
      examples: ['adelie file list', 'adelie file list ./src'],
      handler: (context: CommandContext) => handleList(context.args)
    }
  },
  handler: (context: CommandContext): CommandResult => {
    return {
      success: false,
      message: "Please specify a subcommand. Use 'adelie file --help' for available subcommands."
    };
  }
};
```

## Benefits

1. **Modularity**: Each command is in its own file
2. **Consistency**: All commands follow the same interface
3. **Extensibility**: Easy to add new commands and subcommands
4. **Maintainability**: Clear separation of concerns
5. **Help System**: Automatic help generation
6. **Type Safety**: Full TypeScript support
7. **Testability**: Commands can be easily unit tested

## Migration from Legacy

The old command handlers in `index.ts` have been migrated to individual command modules:
- `handleConfigCommand` → `commands/config.ts`
- `handleMcpCommand` → `commands/mcp.ts`
- `handleSkillsCommand` → `commands/skills.ts`
- `handleMemoryCommand` → `commands/memory.ts`
- `handleConversationCommand` → `commands/conversation.ts`

The CLI maintains full backward compatibility while providing the new modular structure.
