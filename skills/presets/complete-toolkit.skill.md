# Skill: comprehensive-analysis

## Description
Perform comprehensive analysis using multiple tools including web search, file analysis, and documentation retrieval

## When to use
- User wants to research a topic from multiple sources
- User asks to analyze information from web, files, and documentation
- User needs a comprehensive report combining multiple data sources

## Inputs
- topic: Topic or subject to research
- search_web: Whether to include web search (optional, defaults to true)
- analyze_files: Whether to analyze local files (optional, defaults to false)
- file_path: Path to local files to analyze (optional)

## Plan Template
```json
[
  {
    "action": "MCP_RUN",
    "args": {
      "server": "brave-search",
      "tool": "brave_search",
      "input": {
        "query": "$$input.topic",
        "count": "5"
      }
    },
    "id": "web_results"
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "fetch",
      "tool": "fetch",
      "input": {
        "url": "$$web_results.results[0].url"
      }
    },
    "id": "web_content"
  },
  {
    "action": "IF",
    "args": {
      "condition": "$$input.analyze_files",
      "then": [
        {
          "action": "MCP_RUN",
          "args": {
            "server": "filesystem",
            "tool": "read_directory",
            "input": {
              "path": "$$input.file_path"
            }
          },
          "id": "local_files"
        }
      ]
    }
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "sequential-thinking",
      "tool": "think",
      "input": {
        "thought": "Synthesize all the gathered information to provide a comprehensive analysis of: $$input.topic"
      }
    }
  }
]
```

## Example
User: Research artificial intelligence trends including web sources and local documentation

## Expected behavior
The skill will search the web for current AI trends, fetch relevant content, optionally analyze local files, and provide a comprehensive synthesis of all gathered information with insights and analysis.

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
