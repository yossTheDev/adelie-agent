# YI Agent

A powerful, deterministic AI agent with Model Context Protocol (MCP) integration and Skills system.

## Features

### 🚀 Core Capabilities
- **Deterministic Planning**: LLM-powered plan generation with strict validation
- **Control Flow**: FOR_EACH, IF, WHILE loops with DataPiping
- **State Management**: Persistent state with STATE_SET, STATE_APPEND, STATE_GET, STATE_CLEAR
- **MCP Integration**: 8 pre-configured MCP presets for external tools
- **Skills System**: Declarative skills with embedded MCP configuration
- **CLI Interface**: Complete command-line interface for management

### 🛠️ MCP Presets
- **github**: GitHub repository search and operations
- **web-search**: Web search and content fetching
- **docs**: Technical documentation retrieval
- **file-index**: Local file search and semantic search
- **database**: SQLite and PostgreSQL connectivity
- **pdf**: PDF document parsing
- **shell-system**: Controlled command execution
- **complete**: All common tools in one preset

### 🎯 Skills System
- **Declarative Format**: `.skill.md` files with structured sections
- **Template Expansion**: Dynamic variable substitution with `$$input.param`
- **Embedded MCP**: Skills can include their own MCP server configuration
- **Auto-Installation**: MCP dependencies installed automatically
- **Validation**: Strict validation of skill format and content

### 📋 Key Features
- **DataPiping**: Reference previous step results with `$$step_id`
- **Error Handling**: Robust error handling and recovery
- **Extensible**: Easy to add new actions and skills
- **TypeScript**: Full TypeScript support with strict typing

## Quick Start

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd yi-agent

# Install dependencies
npm install

# Build the project
npm run build
```

### Basic Usage

#### 1. Install MCP Presets
```bash
# Install GitHub integration
yi mcp install-preset github

# Install complete toolkit
yi mcp install-preset complete
```

#### 2. Use Skills
```bash
# Install a skill
yi skills install examples/github-search.skill.md

# List available skills
yi skills list

# Validate all skills
yi skills validate
```

#### 3. Run the Agent
```bash
# Interactive mode
yi

# Direct command
yi "Find React repositories on GitHub"
```

## Documentation

- **[Skills & MCP Guide](docs/SKILLS_MCP_GUIDE.md)**: Complete guide for using skills and MCP presets
- **[MCP Config in Skills](docs/MCP_CONFIG_IN_SKILLS.md)**: Advanced configuration guide
- **[Examples](examples/)**: Example skills and configurations
- **[Architecture](docs/architecture.md)**: Core architecture and execution flow
- **[Planner](docs/planner.md)**: Planner behavior, prompt rules, and determinism strategy
- **[Executor](docs/executor.md)**: Runtime execution engine, control flow, and context piping
- **[Configuration](docs/configuration.md)**: User config in `~/.yi-agent/config.json`
- **[MCP Integration](docs/mcp.md)**: MCP registration, planner exposure, and runtime execution
- **[Testing](docs/testing.md)**: Plan test suite and fixture strategy

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Input   │───▶│    Planner       │───▶│   Executor      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────────────┐
                       │ Skills & MCP System   │
                       │ • Skills Management   │
                       │ • MCP Presets       │
                       │ • Auto-installation   │
                       └─────────────────────────┘
```

## Configuration

### Skills Directory
- **Location**: `~/.yi-agent/skills/`
- **Preset Skills**: `skills/presets/`
- **Format**: `.skill.md` with structured sections

### MCP Configuration
- **Location**: `~/.yi-agent/mcp-config.json`
- **Presets**: 8 pre-configured presets
- **Custom**: Skills can embed their own MCP config

### User Config
- **Location**: `~/.yi-agent/config.json`
- **Settings**: Model, endpoint, preferences
- **Dynamic**: Runtime configuration changes

## Development

### Project Structure
```
src/
├── core/
│   ├── actions/          # Action implementations
│   ├── mcp/              # MCP integration
│   ├── skills/            # Skills system
│   ├── planner/           # Plan generation
│   ├── executor/          # Plan execution
│   └── response/          # Response handling
├── cli/                  # Command-line interface
├── examples/              # Example skills
├── plan-tests/           # Test fixtures
└── docs/                 # Documentation
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.
