# MCP Server Configuration in Skills

## Overview

The Skills system now allows including complete MCP server configuration within `.skill.md` files, enabling self-contained skills with their own MCP server configurations.

## Implemented Features

### 1. **Embedded MCP Configuration**
`.skill.md` files can include a `## MCP Server Config` section with complete MCP server configuration:

```markdown
## MCP Server Config
```json
{
  "name": "custom-name",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "tools": ["search_repositories", "get_file_contents"],
  "env": {
    "GITHUB_TOKEN": ""
  },
  "package": "@modelcontextprotocol/server-github"
}
```

### 2. **Automatic Detection**
- System detects the `MCP Server Config` section during parsing
- If a skill has MCP configuration, it uses that configuration instead of installing a preset
- Configuration is stored in the `skill.mcpServerConfig` object

### 3. **Intelligent Installation**
- When installing a skill with MCP configuration:
  - If MCP server already installed → use existing
  - If not installed → automatically install server with skill's configuration
  - If installation fails → clean up skill file

### 4. **Template Expansion**
- During template expansion, MCP server references are replaced with the configured name
- Example: If template uses `"server": "github"`, it's replaced with `"server": "github-custom"`

## File Format

### Complete Structure

```markdown
# Skill: skill-name

## Description
Description of what the skill does

## When to use
- When this skill should be used

## Inputs
- parameter1: description of first parameter
- parameter2: description of second parameter

## Plan Template
```json
[
  {
    "action": "MCP_RUN",
    "args": {
      "server": "server-name",
      "tool": "specific-tool",
      "input": {
        "param1": "$$input.parameter1",
        "param2": "$$input.parameter2"
      }
    }
  }
]
```

## MCP Server Config
```json
{
  "name": "custom-name",
  "command": "command-to-execute",
  "args": ["arg1", "arg2"],
  "tools": ["tool1", "tool2"],
  "env": {
    "ENVIRONMENT_VARIABLE": "value"
  },
  "package": "npm-package"
}
```

## Example
User: example of user input

## Expected behavior
Description of expected result

## Advantages

1. **Autonomy**: Self-contained skills that don't depend on external MCPs
2. **Personalization**: Specific configuration for each need
3. **Portability**: Easy to share skills between different installations
4. **Total Control**: Users define exactly how each MCP behaves

## Usage Examples

### Custom GitHub
```markdown
## MCP Server Config
```json
{
  "name": "github-enterprise",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "tools": [
    "search_repositories",
    "get_file_contents",
    "create_or_update_file",
    "push_files",
    "create_repository",
    "create_issue",
    "create_pull_request",
    "fork_repository",
    "create_branch",
    "list_commits",
    "list_issues",
    "update_issue",
    "add_issue_comment",
    "search_code",
    "search_issues",
    "search_users",
    "get_issue",
    "get_pull_request",
    "list_pull_requests",
    "create_pull_request_review",
    "merge_pull_request",
    "get_pull_request_files",
    "get_pull_request_status",
    "update_pull_request_branch",
    "get_pull_request_comments",
    "get_pull_request_reviews"
  ],
  "env": {
    "GITHUB_TOKEN": "",
    "GITHUB_API_URL": "https://api.github.com"
  },
  "package": "@modelcontextprotocol/server-github-enterprise"
}
```

### Custom Web Search
```markdown
## MCP Server Config
```json
{
  "name": "brave-custom",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "tools": ["brave_search"],
  "env": {
    "BRAVE_API_KEY": "",
    "MAX_RESULTS": "50"
  }
}
```

## CLI Commands

### Installation with MCP Configuration

```bash
# Install a skill with its own MCP configuration
adelie skills install my-custom-skill.skill.md

# System will automatically detect the configuration and use it
```

### Validation

```bash
# Validate that all skills have valid configurations
adelie skills validate
```

## Planner Integration

The planner automatically:
1. Loads all available skills
2. Includes MCP server information in context
3. Expands USE_SKILL templates with corresponding MCP configuration

## Complete Flow

```
User requests skill → Planner detects skill → Expands template with MCP config → Executor executes → Result
```

This implementation provides maximum flexibility for creating specialized skills with completely customized MCP configurations.
