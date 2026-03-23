# Architecture

YI Agent is split into deterministic layers:

1. **Planner** (`src/core/planner`)
   - Converts user input into JSON plans with strict action constraints.
2. **Executor** (`src/core/executor`)
   - Runs steps sequentially with context piping (`$$step_id`) and control-flow support.
3. **Actions** (`src/core/actions`)
   - Concrete deterministic capabilities grouped by domain (filesystem, logic, state, network, system, AI).
4. **Response Generator** (`src/core/response`)
   - Produces final conversational output from execution summary.
5. **CLI** (`src/cli`)
   - Interactive terminal UX and management commands (`config`, `mcp`).

## Determinism Model

- Action catalog is explicit and finite.
- Planner output is sanitized before execution.
- Executor fails fast on invalid action outcomes.
- Filesystem operations verify post-conditions.
- Loop and condition behavior is deterministic and bounded.
