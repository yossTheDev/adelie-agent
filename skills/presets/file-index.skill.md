# Skill: file-search-and-analyze

## Description
Search for files in the filesystem and analyze their content

## When to use
- User wants to find specific files or file types
- User asks to search for code patterns or text in files
- User needs to analyze file contents or directory structure

## Inputs
- path: Directory path to search in (optional, defaults to current directory)
- pattern: File pattern or search term
- file_type: Specific file extension to search for (optional)

## Plan Template
```json
[
  {
    "action": "MCP_RUN",
    "args": {
      "server": "filesystem",
      "tool": "read_directory",
      "input": {
        "path": "$$input.path"
      }
    },
    "id": "list_files"
  },
  {
    "action": "FOR_EACH",
    "args": {
      "items": "$$list_files.files",
      "steps": [
        {
          "action": "MCP_RUN",
          "args": {
            "server": "filesystem",
            "tool": "read_file",
            "input": {
              "path": "$$item.path"
            }
          },
          "id": "read_file"
        },
        {
          "action": "STATE_APPEND",
          "args": {
            "key": "file_contents",
            "value": {
              "file": "$$item.path",
              "content": "$$read_file.content"
            }
          }
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
        "thought": "Analyze the file contents and provide insights about the codebase structure and patterns found for: $$input.pattern"
      }
    }
  }
]
```

## Example
User: Search for TypeScript files in the src directory and analyze their structure

## Expected behavior
The skill will search for TypeScript files in the specified directory, read their contents, and provide a comprehensive analysis of the codebase structure, patterns, and organization.

## MCP Server Config
```json
{
  "name": "filesystem",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "--",
    "/"
  ],
  "tools": [
    "read_file",
    "write_file",
    "read_directory",
    "create_directory",
    "delete_file",
    "move_file",
    "list_directory"
  ],
  "package": "@modelcontextprotocol/server-filesystem"
}
```
