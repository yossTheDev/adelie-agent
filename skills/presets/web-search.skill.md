# Skill: web-search-and-summarize

## Description
Search the web for information and provide a comprehensive summary of the findings

## When to use
- User wants to search for current information on the internet
- User asks to research a topic and summarize the results
- User needs to find recent news, articles, or documentation

## Inputs
- query: Search query for web search
- max_results: Maximum number of search results to include (optional, defaults to 5)

## Plan Template
```json
[
  {
    "action": "MCP_RUN",
    "args": {
      "server": "brave-search",
      "tool": "brave_search",
      "input": {
        "query": "$$input.query",
        "count": "$$input.max_results"
      }
    },
    "id": "search"
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "fetch",
      "tool": "fetch",
      "input": {
        "url": "$$search.results[0].url"
      }
    },
    "id": "fetch_content"
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "sequential-thinking",
      "tool": "think",
      "input": {
        "thought": "Based on the search results and fetched content, provide a comprehensive summary of the findings about: $$input.query"
      }
    }
  }
]
```

## Example
User: Search for recent advances in quantum computing and summarize the key findings

## Expected behavior
The skill will search the web for quantum computing advances, fetch content from the most relevant result, and provide a comprehensive summary of the key findings and developments in the field.

## MCP Server Config
```json
{
  "name": "brave-search",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-brave-search"
  ],
  "tools": [
    "brave_search"
  ],
  "env": {
    "BRAVE_API_KEY": ""
  },
  "package": "@modelcontextprotocol/server-brave-search"
}
```
