# MCP Integration

Adelie Agent supports local MCP registration and planner exposure.

## Storage

- `~/.adelie/mcp.json`

## Registered Server Schema

- `name`
- `command`
- `args`
- `tools`
- `installed_at`

## CLI Commands

- `adelie mcp list`
- `adelie mcp install <name> <command> [args...] [--tools=tool1,tool2]`
- `adelie mcp install-preset <github|notion>`
- `adelie mcp set-env <server> <ENV_KEY> <value>`
- `adelie mcp sync-tools <server>`
- `adelie mcp remove <name>`
- `adelie mcp path`

## Planner Exposure

At plan-generation time, installed MCP tools are injected into prompt context.

After installing a server, run `adelie mcp sync-tools <server>` so tools are discovered live and exposed to the planner.

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

## Common Installations

### GitHub MCP

```bash
yarn tsx src/cli/index.ts mcp install-preset github
yarn tsx src/cli/index.ts mcp set-env github GITHUB_TOKEN <your_token>
yarn tsx src/cli/index.ts mcp sync-tools github
```

### Notion MCP

```bash
yarn tsx src/cli/index.ts mcp install-preset notion
yarn tsx src/cli/index.ts mcp set-env notion NOTION_API_KEY <your_key>
yarn tsx src/cli/index.ts mcp sync-tools notion
```

### Generic MCP package

```bash
yarn tsx src/cli/index.ts mcp install mymcp npx -y @modelcontextprotocol/server-<name>
yarn tsx src/cli/index.ts mcp sync-tools mymcp
```
