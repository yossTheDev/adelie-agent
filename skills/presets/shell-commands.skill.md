# Skill: safe-shell-execution

## Description
Execute shell commands safely with analysis and validation

## When to use
- User wants to run system commands safely
- User asks to execute shell operations with analysis
- User needs to perform controlled system operations

## Inputs
- command: Shell command to execute
- working_directory: Directory to execute the command in (optional)
- analysis_required: Whether to analyze the command before execution (optional, defaults to true)

## Plan Template
```json
[
  {
    "action": "MCP_RUN",
    "args": {
      "server": "sequential-thinking",
      "tool": "think",
      "input": {
        "thought": "Analyze the command '$$input.command' for safety and potential risks before execution"
      }
    },
    "id": "safety_analysis"
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "sequential-thinking",
      "tool": "execute_command",
      "input": {
        "command": "$$input.command",
        "working_directory": "$$input.working_directory"
      }
    },
    "id": "command_result"
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "sequential-thinking",
      "tool": "think",
      "input": {
        "thought": "Analyze the command execution results and provide insights: $$command_result"
      }
    }
  }
]
```

## Example
User: List all TypeScript files in the current directory and their sizes

## Expected behavior
The skill will analyze the command for safety, execute it, and provide a comprehensive analysis of the results with insights about the files found and their characteristics.

## MCP Server Config
```json
{
  "name": "sequential-thinking",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-sequential-thinking"
  ],
  "tools": [
    "think",
    "execute_command",
    "analyze_code",
    "generate_response",
    "validate_input"
  ],
  "package": "@modelcontextprotocol/server-sequential-thinking"
}
```
