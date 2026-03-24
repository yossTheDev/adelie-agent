# MCP Integration

Adelie Agent supports local MCP registration and planner exposure with real tool discovery using `@modelcontextprotocol/sdk`.

## Storage

- `~/.adelie/mcp.json`

## Registered Server Schema

- `name`
- `command`
- `args`
- `tools`
- `installed_at`

## CLI Commands

### Preset Installation (Recommended)
```bash
adelie install-preset github      # Install GitHub MCP server + skill
adelie install-preset web-search   # Install web search capabilities
adelie install-preset complete     # Install all available presets
```

### MCP Server Management
```bash
adelie mcp list                    # List installed servers
adelie mcp remove <name>           # Remove a server
adelie mcp set-env <server> <key> <value>  # Set environment variables
```

### Connection Management
```bash
adelie mcp status                  # Check connection status
adelie mcp test <server>           # Test connection and list tools
adelie mcp disconnect              # Disconnect all servers
```

## Real Tool Discovery

The system now uses `@modelcontextprotocol/sdk` to:
- **Connect directly** to MCP servers using stdio transport
- **Get actual tools** with `client.listTools()` from running servers
- **Execute tools** with `client.callTool()` for real functionality
- **Auto-sync** tools when installing presets

## Planner Exposure

At plan-generation time, MCP tools are automatically discovered and injected into prompt context:
- **Real tools** from connected servers (preferred)
- **Declared tools** from configuration (fallback)
- **Mock tools** for development (final fallback)

## Execution

Planner can use `MCP_RUN` action with real tool execution:

```json
{
  "id": "m1",
  "action": "MCP_RUN",
  "args": {
    "server": "github",
    "tool": "search_repositories",
    "input": {"query":"typescript","language":"typescript"}
  }
}
```

## Key Features

- **🔄 Auto-sync**: Tools synchronized automatically when installing presets
- **🔌 Real connections**: Uses SDK to connect to actual MCP servers
- **🛡️ Robust fallbacks**: Graceful degradation when servers are unavailable
- **📊 Status monitoring**: Real-time connection status and testing

## Common Installations

### GitHub MCP

```bash
adelie install-preset github
adelie mcp set-env github GITHUB_TOKEN <your_token>
adelie mcp test github  # Verify connection and tools
```

### Web Search

```bash
adelie install-preset web-search
adelie mcp set-env brave-search BRAVE_API_KEY <your_key>
adelie mcp test brave-search
```

### Complete Setup

```bash
adelie install-preset complete  # Install all presets
adelie mcp status               # Check all connections
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
