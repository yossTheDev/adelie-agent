# Skill: github-advanced-search

## Description
Advanced GitHub repository search with detailed filtering and analysis capabilities

## When to use
- User wants to find GitHub repositories with specific criteria
- User asks to search for code or projects with filters
- User needs to explore repositories on specific topics with detailed information
- User wants to analyze repository statistics and metadata

## Inputs
- query: Search query string (type: string, required)
- language: Programming language filter (type: string, optional)
- sort: Sort field (stars, forks, updated) (type: string, optional)
- order: Sort order (asc, desc) (type: string, optional)
- limit: Maximum number of results (type: number, optional, defaults to 10)

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
        "order": "$$input.order",
        "per_page": "$$input.limit"
      }
    },
    "id": "search_results"
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "github",
      "tool": "get_repository",
      "input": {
        "owner": "$$search_results.items[0].owner.login",
        "repo": "$$search_results.items[0].name"
      }
    },
    "id": "repo_details"
  }
]
```

## Example
User: Find popular TypeScript repositories with more than 1000 stars, sorted by stars

## Expected behavior
The skill will search GitHub for TypeScript repositories with the specified criteria, sort by stars in descending order, and return detailed information about the top repository including its description, language, star count, and other metadata.

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
    "order": {"type": "string", "enum": ["asc", "desc"], "description": "Sort order"},
    "per_page": {"type": "number", "description": "Results per page (max 100)"}
  },
  "required": ["query"]
}
```
**Examples**:
- Input: {"query": "react hooks", "language": "typescript", "sort": "stars", "per_page": 10}
  Description: Search for TypeScript React hooks repositories sorted by stars

### get_repository
**Description**: Get detailed information about a specific repository
**Usage**: Use this when you need comprehensive repository metadata
**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "owner": {"type": "string", "description": "Repository owner"},
    "repo": {"type": "string", "description": "Repository name"}
  },
  "required": ["owner", "repo"]
}
```
**Examples**:
- Input: {"owner": "facebook", "repo": "react"}
  Description: Get detailed information about Facebook's React repository

## MCP Server Config
```json
{
  "name": "github",
  "command": "npx",
  "args": [
    "-y",
      "@modelcontextprotocol/server-github"
  ],
  "description": "Official GitHub MCP server for repository management and search",
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  },
  "package": "@modelcontextprotocol/server-github"
}
```

## Version
1.0.0

## Author
YI Agent System

## Tags
- github
- search
- repository
- code-discovery
- development