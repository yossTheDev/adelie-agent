# Skill: url-test-skill

## Description
Test skill to demonstrate URL-based installation

## When to use
- Testing URL installation feature
- Demonstration purposes

## Inputs
- message: Test message (type: string, required)

## Plan Template
```json
[
  {
    "action": "STATE_SET",
    "args": {
      "key": "url_test",
      "value": "$$input.message"
    },
    "id": "set_state"
  }
]
```

## Example
User: Test URL installation

## Expected behavior
This skill should demonstrate that skills can be installed from URLs.

## Version
1.0.0

## Author
YI Agent Test

## Tags
- test
- url
- demonstration
