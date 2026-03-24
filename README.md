# Adelie

▲ Adelie is your local assistant - a deterministic automation agent that lives on your machine and respects your privacy.

I'm designed to be a collaborator, not just a tool. I run locally, think step-by-step, and help you get things done with a natural, helpful personality.

## What makes Adelie different

- **Local-first**: I run entirely on your machine (Victus). No cloud, no data leaving your system.
- **Deterministic**: I follow a strict Planner → Executor → Response architecture to minimize errors.
- **Natural personality**: I speak like a helpful assistant, not a computer system.
- **Privacy-respecting**: Your data stays yours. Memory and configuration are stored locally.
- **Step-by-step transparency**: You'll always see my plan before I execute anything.

## Highlights

- Deterministic multi-step execution with context piping (`$$step_id`)
- Control flow support: `FOR_EACH`, `IF`, `WHILE`
- Deterministic logical gates and numeric comparisons
- Verified filesystem operations (post-operation checks)
- Persistent user config in `~/.adelie/config.json`
- **Automatic Memory System**: Memory loads at startup and actively used in responses
- MCP registry and runtime MCP tool exposure to planner
- Skills system with `.skill.md` format and template expansion
- Fixture-based plan integration tests

## Architecture

- `src/core/planner` - prompt + plan generation + sanitization
- `src/core/executor` - control-flow runtime and action orchestration
- `src/core/actions` - domain actions (filesystem, logic, state, network, system, ai)
- `src/core/response` - final user-facing response generation
- `src/cli` - interactive TUI and management commands

See detailed docs in [`docs/README.md`](docs/README.md).

## Installation

1. Install Node.js 20+
2. Install dependencies:

```bash
yarn install
```

3. Build the project:

```bash
yarn build
```

4. Install globally:

```bash
yarn global link
```

5. Ensure Ollama is running with your chosen model.

## Usage

### Mode Selection

Adelie supports two operation modes:

- **Ask Mode** (`--ask`): Direct conversation with the AI, skips planning phase. Best for simple questions, conversations, and quick queries.
- **Planner Mode** (`--planner`): Full planning and execution pipeline. Best for complex tasks that require multiple steps and actions.

**Auto-detection**: When no mode is specified, Adelie automatically detects the appropriate mode based on your query complexity and content.

### Interactive Mode

Just run `adelie` and start talking:

```bash
adelie
```

```
▲ Adelie v1.0.0
Hi there! I'm Adelie, your local assistant.
Currently using: qwen2.5-coder
I'm running locally on your machine and ready to help.

You: where did I define the user interface?

I've scanned your project folders. You defined the main interface in 
`src/components/MainLayout.tsx`. 

Would you like me to open it or summarize its contents?
```

### One-shot Commands

You can also give me tasks directly:

```bash
adelie "what is the weather like?"                    # Auto-detect mode
adelie --ask "tell me a joke"                         # Force ask mode
adelie --planner "create a new project folder"        # Force planner mode
adelie --model qwen2.5-coder "summarize this file"
adelie --context ./src "find all TypeScript files"
```

### CLI Options

```bash
Options:
  --model <name>       Specify the local model to use
  --context <path>     Set base directory for local indexing  
  --config <path>      Path to custom configuration file
  --ask                Use ask mode (direct conversation, no planning)
  --planner            Use planner mode (with action execution)
  --version           Show current version
  --help, -h          Show this help message
```

## Management Commands

### Configuration

```bash
adelie config show
adelie config set model your-model-name
adelie config set max_loop_iterations 200
adelie config path
```

### MCP Servers

```bash
adelie mcp install myserver my-command --tools=search,fetch
adelie mcp install-preset github
adelie mcp set-env github GITHUB_TOKEN <token>
adelie mcp sync-tools github
adelie mcp list
adelie mcp remove myserver
adelie mcp path
```

Planner exposure of MCP tools is automatic from installed MCP registry entries.
For live tool discovery from an MCP server, run `mcp sync-tools <server>`.

### Skills

```bash
adelie skills list
adelie skills install file.skill.md
adelie skills remove skill-name
adelie skills validate
```

### Memory Management

```bash
adelie memory set <key> <value> [--instruction "AI instruction"]
adelie memory list
adelie memory search <query>
adelie memory delete <key>
adelie memory clear
adelie memory stats
```

Memory is automatically loaded at startup and actively used in responses - no manual retrieval needed.
Use `memory set` to store information that will be automatically available in future conversations.

## My Philosophy

I'm designed to be:

- **Helpful, not robotic**: I'll say "I've analyzed your files" instead of "Process completed"
- **Transparent**: You'll always see what I'm planning to do before I do it
- **Local**: I live on your machine and respect your privacy
- **Careful**: I verify my actions and tell you when something goes wrong

## Testing

Run exhaustive fixture tests:

```bash
yarn test:plans
```

## Documentation

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/planner.md`](docs/planner.md)
- [`docs/executor.md`](docs/executor.md)
- [`docs/configuration.md`](docs/configuration.md)
- [`docs/mcp.md`](docs/mcp.md)
- [`docs/testing.md`](docs/testing.md)

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md).

---

**Adelie** - Your local assistant. Privacy-first, step-by-step, always helpful.
