# Creating Skills

Skills are reusable templates that automate common tasks using MCP tools and other actions. This guide shows how to create your own `.skill.md` files.

## Skill File Structure

Every skill file must follow this structure:

```markdown
# Skill: <skill-name>

## Description
<brief description of what the skill does>

## When to use
<describe when users should use this skill>

## Inputs
- <param1>: <type> (<required/optional>) - <description>
- <param2>: <type> (<required/optional>) - <description>

## Plan Template
```json
[
  {
    "action": "<ACTION_NAME>",
    "args": {
      "<param>": "$$input.<input_param>"
    },
    "id": "<step_id>"
  }
]
```

## Example
<example user input that would trigger this skill>

## Expected behavior
<description of what the skill should do>

## MCP Tools (optional)
<tool definitions if this skill uses MCP tools>

## MCP Server Config (optional)
<MCP server configuration if this skill requires a specific server>
```

## Example 1: File Search Skill

```markdown
# Skill: file-search

## Description
Search for files in a directory with specific patterns

## When to use
- User wants to find files matching a pattern
- User needs to locate specific file types
- User wants to search in a specific directory

## Inputs
- directory: string (required) - Directory to search in
- pattern: string (optional) - File pattern to match (default: "*")
- max_results: number (optional) - Maximum results to return (default: 10)

## Plan Template
```json
[
  {
    "action": "READ_DIRECTORY",
    "args": {
      "path": "$$input.directory",
      "pattern": "$$input.pattern"
    },
    "id": "search_results"
  },
  {
    "action": "FILTER",
    "args": {
      "items": "$$search_results",
      "condition": "item.name.includes('$$input.pattern') || '$$input.pattern' === '*'"
    },
    "id": "filtered_results"
  },
  {
    "action": "TAKE",
    "args": {
      "items": "$$filtered_results",
      "count": "$$input.max_results"
    },
    "id": "final_results"
  }
]
```

## Example
User: Find all TypeScript files in the src directory, max 5 results

## Expected behavior
The skill will search the src directory for *.ts files, filter the results, and return up to 5 matching files with their paths and metadata.
```

## Example 2: GitHub Repository Search Skill

```markdown
# Skill: github-repo-search

## Description
Search GitHub repositories with advanced filtering and get detailed information

## When to use
- User wants to find repositories on specific topics
- User needs to filter by language, stars, or other criteria
- User wants detailed repository information

## Inputs
- query: string (required) - Search query
- language: string (optional) - Programming language filter
- min_stars: number (optional) - Minimum star count
- sort: string (optional) - Sort by (stars, forks, updated)
- limit: number (optional) - Max results (default: 10)

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
        "min_stars": "$$input.min_stars",
        "sort": "$$input.sort",
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
User: Find popular TypeScript repositories with at least 1000 stars, sorted by stars

## Expected behavior
The skill will search GitHub for TypeScript repositories with 1000+ stars, sort by star count, and return detailed information about the top repository including description, language, star count, and other metadata.

## MCP Tools

### search_repositories
**Description**: Search for repositories on GitHub with various filters
**Usage**: Use this when you need to find repositories matching specific criteria
**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {"type": "string", "description": "Search query"},
    "language": {"type": "string", "description": "Filter by programming language"},
    "min_stars": {"type": "number", "description": "Minimum star count"},
    "sort": {"type": "string", "enum": ["stars", "forks", "updated"]},
    "per_page": {"type": "number", "description": "Results per page"}
  },
  "required": ["query"]
}
```

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

## MCP Server Config
```json
{
  "name": "github",
  "command": "npx",
  "args": ["-y", "@github/github-mcp-server"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  }
}
```
```

## Example 3: Web Search and Summarize Skill

```markdown
# Skill: web-search-summary

## Description
Search the web for information and summarize the results

## When to use
- User wants to research a topic online
- User needs current information about something
- User wants a summary of web search results

## Inputs
- query: string (required) - Search query
- max_results: number (optional) - Maximum search results (default: 5)

## Plan Template
```json
[
  {
    "action": "MCP_RUN",
    "args": {
      "server": "brave-search",
      "tool": "brave_web_search",
      "input": {
        "query": "$$input.query",
        "count": "$$input.max_results"
      }
    },
    "id": "search_results"
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "fetch",
      "tool": "fetch_url",
      "input": {
        "url": "$$search_results.results[0].url"
      }
    },
    "id": "page_content"
  },
  {
    "action": "AI_SUMMARIZE",
    "args": {
      "content": "$$page_content",
      "max_length": 200
    },
    "id": "summary"
  }
]
```

## Example
User: Search for information about TypeScript frameworks and summarize the top result

## Expected behavior
The skill will search the web for TypeScript frameworks, fetch the content of the top result, and create a concise summary of the key information.
```

## Best Practices

### 1. **Input Validation**
- Always specify required vs optional parameters
- Include default values for optional parameters
- Use clear parameter descriptions

### 2. **Error Handling**
- Include error handling steps in your plan
- Provide fallback behavior when possible
- Use descriptive step IDs for debugging

### 3. **Data Piping**
- Use `$$input.param` for user input
- Use `$$step_id` to pass data between steps
- Chain results logically through the plan

### 4. **MCP Integration**
- Define MCP tools if your skill uses them
- Include MCP server configuration for required servers
- Test with actual MCP servers when possible

### 5. **Documentation**
- Provide clear examples
- Describe expected behavior
- Include when to use guidance

## Installing Your Skill

1. **Save the file** with `.skill.md` extension
2. **Install it** using the CLI:
   ```bash
   adelie skills install my-skill.skill.md
   ```
3. **Test it** by triggering the skill in conversation
4. **Validate it** with:
   ```bash
   adelie skills validate my-skill.skill.md
   ```

## Advanced Features

### Conditional Logic
Use `IF` actions for conditional execution:

```json
{
  "action": "IF",
  "args": {
    "condition": "$$search_results.length > 0",
    "then": [
      {
        "action": "PROCESS_RESULTS",
        "args": {"data": "$$search_results"}
      }
    ],
    "else": [
      {
        "action": "SHOW_MESSAGE",
        "args": {"message": "No results found"}
      }
    ]
  }
}
```

### Loops
Use `FOR_EACH` for processing multiple items:

```json
{
  "action": "FOR_EACH",
  "args": {
    "items": "$$search_results.items",
    "variable": "repo",
    "steps": [
      {
        "action": "MCP_RUN",
        "args": {
          "server": "github",
          "tool": "get_repository",
          "input": {
            "owner": "$$repo.owner.login",
            "repo": "$$repo.name"
          }
        },
        "id": "repo_details_$$index"
      }
    ]
  }
}
```

### State Management
Use state actions for persistent data:

```json
{
  "action": "STATE_SET",
  "args": {
    "key": "last_search_query",
    "value": "$$input.query"
  }
}
```

This comprehensive guide should help you create powerful, reusable skills for Adelie!
