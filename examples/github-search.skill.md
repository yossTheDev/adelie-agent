# Skill: github-search

## Description
Search for repositories on GitHub based on a query string

## When to use
- User wants to find GitHub repositories
- User asks to search for code or projects
- User wants to explore repositories on a specific topic

## Inputs
- query: Search query string for GitHub repositories

## Plan Template
```json
[
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
]
```

## Example
User: Find repositories about TypeScript web frameworks

## Expected behavior
The skill will search GitHub for repositories matching "TypeScript web frameworks" and return a list of relevant repositories with their details such as name, description, stars, and URL.
