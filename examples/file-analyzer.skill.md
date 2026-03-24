# Skill: file-analyzer

## Description
Analyze files in a directory and provide a comprehensive report

## When to use
- User wants to understand the structure of a codebase
- User asks to analyze files in a directory
- User wants to find specific types of files or patterns

## Inputs
- path: Directory path to analyze
- pattern: File pattern to match (optional, defaults to all files)

## Plan Template
```json
[
  {
    "action": "FILTER_FILES",
    "args": {
      "path": "$$input.path",
      "pattern": "$$input.pattern"
    }
  },
  {
    "action": "FOR_EACH",
    "args": {
      "items": "$$1",
      "template": [
        {
          "action": "READ_FILE",
          "args": {
            "path": "$$item"
          }
        },
        {
          "action": "AI_TRANSFORM",
          "args": {
            "task": "Analyze this file content and identify key characteristics",
            "content": "$$2"
          }
        }
      ]
    }
  },
  {
    "action": "AI_TRANSFORM",
    "args": {
      "task": "Provide a comprehensive analysis summary of all analyzed files",
      "content": "$$3"
    }
  }
]
```

## Example
User: Analyze all TypeScript files in the src directory

## Expected behavior
The skill will find all TypeScript files in the specified directory, read each file, analyze its content using AI, and then provide a comprehensive summary of the entire codebase structure and characteristics.
