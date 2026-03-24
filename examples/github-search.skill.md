# Skill: github-search

## Description
Search for repositories on GitHub based on a query string

## When to use
- User wants to find GitHub repositories
- User asks to search for code or projects
- User wants to explore repositories on a specific topic

## Inputs
- query: string (required) - Search query string for GitHub repositories
- language: string (optional) - Programming language filter
- sort: string (optional) - Sort field (stars, forks, updated)
- limit: number (optional) - Maximum number of results (default: 10)

## Plan Template
```json
[
  {
    "action": "MCP_RUN",
    "args": {
      "server": "github",
      "tool": "search_repositories",
      "input": {
        "query": "$$input.query",
        "language": "$$input.language",
        "sort": "$$input.sort",
        "per_page": "$$input.limit"
      }
    },
    "id": "search_results"
  }
]
```

## Example
User: Find repositories about TypeScript web frameworks, sorted by stars

## Expected behavior
The skill will search GitHub for repositories matching "TypeScript web frameworks" and return a list of relevant repositories with their details such as name, description, stars, and URL.

## MCP Tools

### search_repositories
**Description**: Search for repositories on GitHub with various filters and sorting options
**Usage**: Use this when you need to find repositories matching specific criteria
**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {"type": "string", "description": "Search query"},
    "language": {"type": "string", "description": "Filter by programming language"},
    "sort": {"type": "string", "enum": ["stars", "forks", "updated"], "description": "Sort field"},
    "per_page": {"type": "number", "description": "Results per page (max 100)"}
  },
  "required": ["query"]
}
```

## MCP Server Config
```json
{
  "name": "github",
  "command": "npx",
  "args": [
    "-y",
    "@github/github-mcp-server"
  ],
  "description": "Official GitHub MCP server for repository management and search",
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  },
  "package": "@github/github-mcp-server"
}
```
