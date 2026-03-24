# Skills & MCP System Guide

## Overview

The YI Agent now includes a powerful Skills and MCP (Model Context Protocol) integration system that allows users to install predefined capabilities and enhance the agent's functionality.

## Quick Start

### 1. Install MCP Presets

```bash
# Install GitHub integration
yi mcp install-preset github

# Install web search capabilities
yi mcp install-preset web-search

# Install complete preset (all common tools)
yi mcp install-preset complete
```

### 2. Install Skills

```bash
# Install a skill file
yi skills install examples/github-search.skill.md

# List installed skills
yi skills list

# Validate all skills
yi skills validate
```

### 3. Use Skills in Agent

Once skills are installed, the planner will automatically detect when to use them based on your input:

```
User: Find TypeScript frameworks on GitHub
# Agent will automatically use the github-search skill

User: Search for quantum computing advances and summarize
# Agent will use web-search-and-summarize skill
```

## Available MCP Presets

| Preset | Description | Tools Included |
|---------|-------------|----------------|
| `github` | GitHub repository search and access | GitHub API |
| `web-search` | Web search and content fetching | Brave Search, Fetch |
| `docs` | Technical documentation retrieval | Puppeteer |
| `file-index` | Local file search and semantic search | Filesystem, SQLite |
| `database` | Database connectivity | SQLite, PostgreSQL |
| `pdf` | PDF document parsing | PDF Reader |
| `shell-system` | Controlled command execution | Sequential Thinking |
| `complete` | All common tools | All above |

## Creating Custom Skills

### Skill File Structure

Create `.skill.md` files with this strict format:

```markdown
# Skill: <skill-name>

## Description
<short explanation of what the skill does>

## When to use
- <condition 1>
- <condition 2>
- <condition 3>

## Inputs
- input_name: description of the input parameter

## Plan Template
```json
[
  {
    "action": "ACTION_NAME",
    "args": {
      "parameter": "$$input.input_name"
    }
  }
]
```

## Example
User: <example user input>

## Expected behavior
<description of what should happen>
```

### Skill Template Variables

Use `$$input.param_name` to reference input parameters in your template:

```json
{
  "action": "MCP_RUN",
  "args": {
    "server": "github",
    "tool": "search_repositories",
    "input": {
      "query": "$$input.query"
    }
  }
}
```

### MCP Integration

If your skill uses MCP tools, the system will automatically:

1. Detect MCP servers referenced in the template
2. Install required MCP servers if not already installed
3. Make the skill available for use

Example MCP action:
```json
{
  "action": "MCP_RUN",
  "args": {
    "server": "github",
    "tool": "search_repositories",
    "input": {
      "query": "$$input.query",
      "limit": 10
    }
  }
}
```

## Advanced Features

### Embedded MCP Server Configuration

Skills can include their own MCP server configuration using the `## MCP Server Config` section:

```markdown
## MCP Server Config
```json
{
  "name": "custom-server-name",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "tools": ["search_repositories", "get_file_contents"],
  "env": {
    "GITHUB_TOKEN": ""
  },
  "package": "@modelcontextprotocol/server-github"
}
```

When a skill includes this configuration, the system will use this specific MCP server configuration instead of installing a preset.

## CLI Commands Reference

### MCP Management

```bash
# List available presets
yi mcp install-preset

# Install a preset
yi mcp install-preset <preset-name>

# List installed MCP servers
yi mcp list

# Remove an MCP server
yi mcp remove <server-name>

# Set environment variables
yi mcp set-env <server> <KEY> <value>
```

### Skills Management

```bash
# List installed skills
yi skills list

# Install a skill
yi skills install <path/to/skill.skill.md>

# Remove a skill
yi skills remove <skill-name>

# Validate all skills
yi skills validate
```

## Example Skills

### GitHub Search
```bash
yi skills install examples/github-search.skill.md
```
Usage: "Find React repositories on GitHub"

### Web Search & Summarize
```bash
yi skills install examples/web-search-and-summarize.skill.md
```
Usage: "Search for AI news and summarize the findings"

### File Analyzer
```bash
yi skills install examples/file-analyzer.skill.md
```
Usage: "Analyze all TypeScript files in the src directory"

## Environment Variables

Some MCP servers require environment variables:

- **GitHub**: `GITHUB_TOKEN` - Personal access token
- **Brave Search**: `BRAVE_API_KEY` - API key for search
- **Notion**: `NOTION_API_KEY` - Integration token

Set them with:
```bash
yi mcp set-env github GITHUB_TOKEN your_token_here
```

## File Locations

- **Skills Directory**: `~/.adelie/skills/`
- **MCP Config**: `~/.adelie/mcp-config.json`

## Troubleshooting

### Skill Installation Fails
1. Check skill file format with `yi skills validate`
2. Ensure all required sections are present
3. Verify JSON template is valid

### MCP Server Issues
1. Check if server is installed: `yi mcp list`
2. Verify environment variables are set
3. Check server logs for errors

### Skill Not Working
1. Verify MCP dependencies are installed
2. Check skill template syntax
3. Test with simple inputs first

## Advanced Features

### Skill Composition
Skills can reference other skills in their templates, enabling complex workflows.

### Dynamic MCP Detection
The system automatically detects MCP servers from skill templates and installs dependencies.
