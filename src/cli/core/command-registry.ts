import type { Command, CommandRegistry, CommandContext } from '../types/command.js';

class CommandRegistryImpl implements CommandRegistry {
  private commands = new Map<string, Command>();

  register(command: Command): void {
    this.commands.set(command.name, command);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  list(): Command[] {
    return Array.from(this.commands.values());
  }

  showHelp(commandName?: string): void {
    if (commandName) {
      const command = this.get(commandName);
      if (!command) {
        console.log(`Command '${commandName}' not found.`);
        return;
      }
      this.showCommandHelp(command);
    } else {
      this.showGeneralHelp();
    }
  }

  private showCommandHelp(command: Command): void {
    console.log(`\n▲ ${command.name}`);
    console.log(`\nDESCRIPTION:`);
    console.log(`  ${command.description}`);
    console.log(`\nUSAGE:`);
    console.log(`  ${command.usage}`);
    
    if (command.examples.length > 0) {
      console.log(`\nEXAMPLES:`);
      command.examples.forEach(example => {
        console.log(`  ${example}`);
      });
    }

    if (command.subcommands && Object.keys(command.subcommands).length > 0) {
      console.log(`\nSUBCOMMANDS:`);
      Object.entries(command.subcommands).forEach(([name, subcommand]) => {
        console.log(`  ${name.padEnd(12)} ${subcommand.description}`);
      });
    }
    console.log();
  }

  private showGeneralHelp(): void {
    const commands = this.list();
    const maxLength = Math.max(...commands.map(cmd => cmd.name.length));
    
    console.log(`\n▲ Adelie Commands:\n`);
    commands.forEach(command => {
      console.log(`  ${command.name.padEnd(maxLength)}  ${command.description}`);
    });
    console.log(`\nUse 'adelie <command> --help' for more information on a specific command.\n`);
  }
}

export const commandRegistry = new CommandRegistryImpl();
