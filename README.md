# YI Agent

YI Agent is a deterministic local automation agent with a strict **Planner -> Executor -> Response** architecture.

It is designed to minimize hallucinations by constraining planning to known actions, validating plans, and executing with deterministic checks.

## Highlights

- Deterministic multi-step execution with context piping (`$$step_id`)
- Control flow support: `FOR_EACH`, `IF`, `WHILE`
- Deterministic logical gates and numeric comparisons
- Verified filesystem operations (post-operation checks)
- Persistent user config in `~/.yi-agente/config.json`
- MCP registry and runtime MCP tool exposure to planner
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

3. Ensure Ollama is running with your chosen model.

## Run

```bash
yarn dev
```

## CLI Management

### Agent config

```bash
yarn tsx src/cli/index.ts config show
yarn tsx src/cli/index.ts config set model your-model-name
yarn tsx src/cli/index.ts config set max_loop_iterations 200
yarn tsx src/cli/index.ts config path
```

### MCP registry

```bash
yarn tsx src/cli/index.ts mcp install myserver my-command --tools=search,fetch
yarn tsx src/cli/index.ts mcp install-preset github
yarn tsx src/cli/index.ts mcp set-env github GITHUB_TOKEN <token>
yarn tsx src/cli/index.ts mcp sync-tools github
yarn tsx src/cli/index.ts mcp list
yarn tsx src/cli/index.ts mcp remove myserver
yarn tsx src/cli/index.ts mcp path
```

Planner exposure of MCP tools is automatic from installed MCP registry entries.
For live tool discovery from an MCP server, run `mcp sync-tools <server>`.

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
