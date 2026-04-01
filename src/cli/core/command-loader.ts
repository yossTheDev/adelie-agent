import { commandRegistry } from './command-registry.js';
import { configCommand } from '../commands/config.js';
import { mcpCommand } from '../commands/mcp.js';
import { skillsCommand } from '../commands/skills.js';
import { memoryCommand } from '../commands/memory.js';
import { conversationCommand } from '../commands/conversation.js';
import { providerCommand } from '../commands/provider.js';

export const loadCommands = (): void => {
  // Register all commands
  commandRegistry.register(configCommand);
  commandRegistry.register(mcpCommand);
  commandRegistry.register(skillsCommand);
  commandRegistry.register(memoryCommand);
  commandRegistry.register(conversationCommand);
  commandRegistry.register(providerCommand);
};

export const getCommandRegistry = () => commandRegistry;
