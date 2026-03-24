# Skill: web-documentation-fetch

## Description
Fetch and extract content from web documentation pages

## When to use
- User wants to retrieve documentation from a specific website
- User asks to get API documentation or technical guides
- User needs to extract structured content from web pages

## Inputs
- url: URL of the documentation page to fetch
- selector: CSS selector to extract specific content (optional)

## Plan Template
```json
[
  {
    "action": "MCP_RUN",
    "args": {
      "server": "puppeteer",
      "tool": "navigate",
      "input": {
        "url": "$$input.url"
      }
    },
    "id": "navigate"
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "puppeteer",
      "tool": "get_page_content",
      "input": {
        "selector": "$$input.selector"
      }
    },
    "id": "content"
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "sequential-thinking",
      "tool": "think",
      "input": {
        "thought": "Extract and organize the key information from the documentation page"
      }
    }
  }
]
```

## Example
User: Fetch the React documentation from https://react.dev and extract the main concepts

## Expected behavior
The skill will navigate to the specified URL, extract the page content, and provide a structured summary of the key concepts and information from the documentation.

## MCP Server Config
```json
{
  "name": "puppeteer",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-puppeteer"
  ],
  "tools": [
    "navigate",
    "click",
    "type",
    "get_page_content",
    "screenshot",
    "get_element_text",
    "wait_for_element",
    "scroll"
  ],
  "package": "@modelcontextprotocol/server-puppeteer"
}
```
