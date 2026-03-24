# Skills & MCP System Guide

## Overview

The Adelie Agent includes a powerful Skills and MCP (Model Context Protocol) integration system that allows users to install predefined capabilities and enhance the agent's functionality with **real tool discovery using `@modelcontextprotocol/sdk`**.

## Quick Start

### 1. Install MCP Presets (Recommended)

```bash
# Install GitHub integration
adelie install-preset github

# Install web search capabilities
adelie install-preset web-search

# Install complete preset (all common tools)
adelie install-preset complete
```

### 2. Install Individual Skills

```bash
# Install a skill file
adelie skills install examples/github-search.skill.md

# List installed skills
adelie skills list

# Validate skill syntax
adelie skills validate my-skill.skill.md
```

## System Architecture

### Skills Directory Structure
- **`skills/`** - Main skills directory (GitHub skill lives here)
- **`skills/presets/`** - Additional preset skills
- **`~/.adelie/skills/`** - User-installed skills
- **`~/.adelie/mcp.json`** - Unified MCP configuration

### MCP Integration with SDK
- **🔄 Real Tool Discovery**: Uses `@modelcontextprotocol/sdk` to connect to actual MCP servers
- **🔌 Auto-sync**: Tools automatically synchronized when installing presets
- **📊 Connection Management**: Real-time status monitoring and testing
- **🛡️ Robust Fallbacks**: Falls back to declared tools if servers are unavailable

## Available Presets

| Preset | Description | MCP Servers | Skills |
|---------|-------------|--------------|--------|
| `github` | GitHub integration | github | github-search |
| `web-search` | Web search & content fetching | brave-search, fetch | web-search |
| `docs` | Technical documentation retrieval | puppeteer | docs-retrieval |
| `file-index` | Semantic and local file search | filesystem, sqlite | file-index |
| `database` | Database connectivity | sqlite, postgres | database-query |
| `pdf` | PDF document parsing | pdf-reader | pdf-analysis |
| `shell-system` | System operations | sequential-thinking | shell-commands |
| `complete` | All common tools | All servers | All skills |

## CLI Commands

### Preset Management
```bash
adelie install-preset <name>    # Install preset with server + skills
adelie mcp list                 # List installed MCP servers
adelie mcp remove <name>        # Remove MCP server
```

### Skills Management
```bash
adelie skills list              # List installed skills
adelie skills install <file>     # Install skill file
adelie skills remove <name>      # Remove skill
adelie skills validate <file>    # Validate skill syntax
```

### Connection Management (NEW!)
```bash
adelie mcp status              # Check connection status
adelie mcp test <server>       # Test connection and list tools
adelie mcp disconnect           # Disconnect all servers
```

### Environment Configuration
```bash
adelie mcp set-env <server> <key> <value>  # Set environment variables
```

## Real Tool Discovery Process

1. **Preset Installation**: `adelie install-preset github` installs server + skill
2. **Server Connection**: System connects to MCP server using SDK stdio transport
3. **Tool Discovery**: `client.listTools()` gets actual available tools from running server
4. **Auto-sync**: Tools synchronized with configuration automatically
5. **Planner Integration**: Real tools exposed to planner for use in plans

## Usage Examples

### Using GitHub Preset
```bash
# Install GitHub preset
adelie install-preset github

# Set token
adelie mcp set-env github GITHUB_TOKEN your_token

# Test connection
adelie mcp test github

# Use in conversation
"Search for TypeScript repositories with over 1000 stars"
```

### Creating Custom Skills
See **[10-creating-skills.md](10-creating-skills.md)** for complete guide on creating custom skills with MCP integration.

## Key Features

- **🔄 Auto-sync**: Tools synchronized automatically when installing presets
- **🔌 Real connections**: Uses SDK to connect to actual MCP servers
- **🛡️ Robust fallbacks**: Graceful degradation when servers are unavailable
- **📊 Status monitoring**: Real-time connection status and testing
- **🎯 Template expansion**: Skills expand into executable plans automatically
- **🔧 Environment management**: Secure environment variable handling

## File Locations

- **Skills Directory**: `~/.adelie/skills/`
- **MCP Config**: `~/.adelie/mcp.json`
- **Examples**: `examples/*.skill.md`

## Troubleshooting

### Common Issues

**Server not connecting:**
```bash
# Check connection status
adelie mcp status

# Test specific server
adelie mcp test github

# Verify environment variables
adelie mcp list
```

**Skills not found:**
```bash
# Verify skill installation
adelie skills list

# Validate skill syntax
adelie skills validate my-skill.skill.md
```

**Tools not available:**
```bash
# Force tool sync
adelie mcp test github

# Check if server is running
ps aux | grep github-mcp-server
```

### Environment Variables

Some MCP servers require environment variables:

- **GitHub**: `GITHUB_TOKEN` - Personal access token
- **Brave Search**: `BRAVE_API_KEY` - API key for search
- **Notion**: `NOTION_API_KEY` - Integration token

Set them with:
```bash
adelie mcp set-env github GITHUB_TOKEN your_token_here
```

This system provides maximum flexibility for creating specialized skills with completely customized MCP configurations while maintaining robust real tool discovery.
