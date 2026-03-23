# MCP Integration

YI Agent supports local MCP registration and planner exposure.

## Storage

- `~/.yi-agente/mcp.json`

## Registered Server Schema

- `name`
- `command`
- `args`
- `tools`
- `installed_at`

## CLI Commands

- `yi mcp list`
- `yi mcp install <name> <command> [args...] [--tools=tool1,tool2]`
- `yi mcp remove <name>`
- `yi mcp path`

## Planner Exposure

At plan-generation time, installed MCP tools are injected into prompt context.

## Execution

Planner can use `MCP_RUN` action:

```json
{
  "id": "m1",
  "action": "MCP_RUN",
  "args": {
    "server": "my-server",
    "tool": "search",
    "input": "{\"query\":\"hello\"}"
  }
}
```
