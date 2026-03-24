# Adelie

▲ Adelie is your local assistant - a deterministic automation agent optimized for small LLMs that lives on your machine and respects your privacy.

I'm designed to be a collaborator, not just a tool. I run locally, think step-by-step, and help you get things done with a natural, helpful personality.

## What makes Adelie different

- **Local-first**: I run entirely on your machine. No cloud, no data leaving your system.
- **Optimized for Small LLMs**: My Planner → Executor → Response architecture is specifically designed to work efficiently with smaller models, reducing context requirements and improving reliability.
- **Deterministic**: I follow a strict layered architecture to minimize errors and maximize predictability.
- **Natural personality**: I speak like a helpful assistant, not a computer system.
- **Privacy-respecting**: Your data stays yours. Memory and configuration are stored locally.
- **Step-by-step transparency**: You'll always see my plan before I execute anything.

## Architecture Advantage for Small LLMs

Traditional agents rely on large models to handle complex reasoning in a single step. Adelie's architecture breaks down tasks into manageable layers:

### 1. **Planner Layer** (`src/core/planner`)
- Converts user input into structured JSON plans
- Uses deterministic action constraints to reduce complexity
- Optimized prompts that work well with smaller context windows
- Sanitizes and validates plans before execution

### 2. **Executor Layer** (`src/core/executor`)
- Executes plans step-by-step with deterministic control flow
- Handles context piping (`$$step_id`) automatically
- Supports loops (`FOR_EACH`, `WHILE`) and conditions (`IF`)
- Manages state and memory without requiring complex reasoning

### 3. **Response Layer** (`src/core/response`)
- Generates natural language responses from execution results
- Separates execution logic from communication
- Provides clear, helpful feedback to users

**Why this matters for small LLMs:**
- **Reduced Context Requirements**: Each layer only needs to focus on its specific task
- **Deterministic Behavior**: Less reliance on complex reasoning capabilities
- **Modular Design**: Smaller, focused prompts that work reliably with limited models
- **Error Containment**: Issues in one layer don't cascade to others
- **Predictable Performance**: Consistent behavior across different model sizes

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

See detailed documentation in the [`docs/`](docs/) directory with numbered guides:

- **01-architecture.md** - System architecture overview
- **02-configuration.md** - Configuration management
- **03-planner.md** - Planning system details
- **04-executor.md** - Execution engine
- **05-mcp.md** - MCP integration and presets
- **06-testing.md** - Testing framework
- **07-memory-system.md** - Memory management
- **08-skills-mcp-guide.md** - Skills and MCP integration
- **09-mcp-config-in-skills.md** - MCP configuration in skills
- **10-creating-skills.md** - Creating custom skills

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

### MCP Servers & Presets

```bash
# Install MCP presets (includes server + skills)
adelie install-preset github
adelie install-preset web-search
adelie install-preset complete

# MCP server management
adelie mcp list
adelie mcp remove myserver
adelie mcp set-env github GITHUB_TOKEN <token>

# MCP connection management
adelie mcp status          # Check connection status
adelie mcp test github     # Test connection and list tools
adelie mcp disconnect      # Disconnect all servers
```

**Key Features:**
- **Real Tool Discovery**: Uses `@modelcontextprotocol/sdk` to get actual tools from servers
- **Auto-sync**: Tools are automatically synchronized when installing presets
- **Connection Management**: Real-time connection status and testing
- **Fallback Support**: Graceful fallback to declared tools if server is unavailable

### Skills

```bash
adelie skills list
adelie skills install file.skill.md
adelie skills remove skill-name
adelie skills validate
```

**Skills Integration:**
- Skills are automatically installed with MCP presets
- Templates expand into executable plans with `USE_SKILL` action
- MCP tools from skills are automatically discovered and synchronized

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

- [`docs/01-architecture.md`](docs/01-architecture.md) - System architecture overview
- [`docs/02-configuration.md`](docs/02-configuration.md) - Configuration guide
- [`docs/03-planner.md`](docs/03-planner.md) - Planner layer details
- [`docs/04-executor.md`](docs/04-executor.md) - Executor layer details
- [`docs/05-mcp.md`](docs/05-mcp.md) - MCP integration
- [`docs/06-testing.md`](docs/06-testing.md) - Testing framework
- [`docs/07-memory-system.md`](docs/07-memory-system.md) - Memory system
- [`docs/08-skills-mcp-guide.md`](docs/08-skills-mcp-guide.md) - Skills and MCP guide
- [`docs/09-mcp-config-in-skills.md`](docs/09-mcp-config-in-skills.md) - MCP configuration in skills

## Changelog

See [`CHANGELOG.md`](CHANGELOG.md).

---

**Adelie** - Your local assistant. Optimized for small LLMs, privacy-first, step-by-step, always helpful.
