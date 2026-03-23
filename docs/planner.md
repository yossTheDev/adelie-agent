# Planner

The planner receives:

- The complete action catalog (`ACTION_ARGS` + descriptions)
- Runtime MCP tool exposure text (from installed MCP servers)
- User request
- Strict prompt rules for deterministic planning

## Key Properties

- Returns only `{"plan":[...]}` JSON.
- Unknown actions are discarded during sanitization.
- Invalid args are filtered per action.
- Structural actions are normalized:
  - `FOR_EACH.template` => array form
  - `IF.then/else` => arrays
  - `WHILE.body` => array

## MCP Exposure

Installed MCP tools are injected into the planner context as:

- `server.tool` entries under "AVAILABLE MCP TOOLS"
- Planner instruction to use `MCP_RUN` when MCP tools are needed:
  - `{"action":"MCP_RUN","args":{"server":"...","tool":"...","input":"..."}}`
