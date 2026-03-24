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

## MCP Server Config
```json
{
  "name": "github",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-github"
  ],
  "tools": [
    "create_or_update_file",
    "search_repositories",
    "create_repository",
    "get_file_contents",
    "push_files",
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
    "GITHUB_PERSONAL_ACCESS_TOKEN": ""
  },
  "package": "@modelcontextprotocol/server-github"
}
```
