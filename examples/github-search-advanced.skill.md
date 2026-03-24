# Skill: github-search-advanced

## Description
Advanced GitHub repository search with custom MCP server configuration

## When to use
- User wants to search GitHub repositories with custom configuration
- User needs specific GitHub tools not in standard preset
- User wants to use custom GitHub token or configuration

## Inputs
- query: Search query string for GitHub repositories
- limit: Maximum number of results to return (optional, defaults to 10)

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
        "limit": "$$input.limit"
      }
    }
  }
]
```

## Example
User: Find up to 20 React repositories with stars above 1000

## Expected behavior
The skill will search GitHub for repositories matching "React" with a limit of 20 results and only include repositories with more than 1000 stars.

## MCP Server Config
```json
{
  "name": "github-custom",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-github"
  ],
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
    "GITHUB_TOKEN": ""
  },
  "package": "@modelcontextprotocol/server-github"
}
```
