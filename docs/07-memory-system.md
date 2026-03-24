# Memory System

The Adelie Agent includes an automatic memory system that loads at startup and actively uses stored information in responses.

## Overview

The memory system provides persistent storage and automatic retrieval of user information, preferences, and context. Unlike traditional systems that require manual retrieval commands, Adelie Agent loads all memory at startup and makes it automatically available in both planning and response generation.

## Features

### 🚀 Automatic Loading
- **Startup Loading**: All memory entries are loaded when the CLI starts
- **Immediate Availability**: Memory is available from the first interaction
- **No Manual Retrieval**: No need for MEMORY_GET commands - memory is always accessible
- **Performance Optimized**: Single load operation instead of per-request searches

### 🧠 Active Usage
- **Response Integration**: Memory automatically used to personalize responses
- **Planner Context**: Memory available during plan generation for informed decisions
- **Natural Integration**: Memory used seamlessly without exposing internal mechanics
- **Priority System**: Memory takes precedence over system context when conflicts occur

### 💾 Persistent Storage
- **JSON-based Storage**: Memory stored in `~/.adelie/memory.json`
- **Key-Value Structure**: Simple and efficient data organization
- **Metadata Tracking**: Automatic timestamp and source tracking
- **Type Flexibility**: Support for strings, numbers, objects, and arrays

## Memory Operations

### Storage Commands
```bash
# Store simple data
adelie memory set user_name "Alice"

# Store with AI processing
adelie memory set user_profile "Alice is a developer who loves TypeScript" --instruction "Extract user info as JSON"

# Store structured data
adelie memory set preferences '{"theme": "dark", "language": "typescript"}'
```

### Management Commands
```bash
# List all memory entries
adelie memory list

# Search memory
adelie memory search "preferences"

# Delete specific entry
adelie memory delete user_name

# Clear all memory
adelie memory clear

# Get memory statistics
adelie memory stats
```

## AI Processing

The `MEMORY_SET` action supports optional AI processing for intelligent data extraction:

### When to Use AI Processing
- **User Profiles**: Extract structured information from natural language descriptions
- **Preferences**: Parse and organize preference statements
- **Complex Data**: Convert unstructured input to organized JSON
- **Relationships**: Extract relationships and connections between data points

### AI Processing Example
```bash
adelie memory set profile "John is a 30-year-old frontend developer specializing in React and TypeScript. He works at TechCorp and loves coffee." \
  --instruction "Extract person information as JSON with name, age, profession, skills, company, and preferences fields"
```

**Result**:
```json
{
  "name": "John",
  "age": 30,
  "profession": "frontend developer",
  "skills": ["React", "TypeScript"],
  "company": "TechCorp",
  "preferences": ["coffee"]
}
```

## Automatic Response Integration

### How Memory Works in Responses

1. **Automatic Loading**: When CLI starts, all memory is loaded into context
2. **Intelligent Matching**: User input is analyzed for relevant memory entries
3. **Seamless Integration**: Memory is used naturally in responses without explicit commands
4. **Personalization**: Responses are tailored based on stored user information
5. **Context Awareness**: Memory provides ongoing context across conversations

### Example Interaction

```
User: "Remember that I prefer dark theme and work with React"
→ System: Stores preference automatically

User: "What are my preferences?"
→ Response: "Based on what I remember, you prefer dark theme and work with React."

User: "Help me set up a new project"
→ Response: "Since you work with React, I'll help you set up a React project with dark theme."
```

## Best Practices

### Memory Keys
- Use descriptive keys: `user_preferences` instead of `data1`
- Use consistent naming: `project_alpha_config` instead of random names
- Include context: `meeting_notes_2024_03_15` instead of `notes`

### Data Organization
- Use AI processing for complex data to maintain structure
- Include source information for tracking data origins
- Use appropriate data types (objects for structured data, strings for simple values)

### Privacy and Security
- Memory is stored locally in `~/.adelie/`
- No data is transmitted to external services
- Sensitive data should be stored with appropriate keys
- Regular cleanup of outdated information using `memory clear`

## Memory in Planning

The planner automatically has access to all stored memory when generating plans:

- **Context-Aware Planning**: Plans consider existing user information
- **Preference Integration**: User preferences influence action selection
- **Avoid Redundancy**: System avoids asking for already stored information
- **Smart Decisions**: Memory informs conditional logic and action parameters

## Troubleshooting

### Memory Not Loading
- Check file permissions in `~/.adelie/`
- Verify memory file exists: `ls ~/.adelie/memory.json`
- Restart CLI to trigger memory loading

### AI Processing Issues
- Ensure Ollama is running and accessible
- Check instruction parameter is properly quoted
- Verify input data is meaningful for AI processing

### Memory Not Used in Responses
- Verify memory contains relevant information
- Check that memory was successfully stored
- Review user input for memory-relevant terms

## Integration with Other Systems

### Skills Integration
Memory works seamlessly with the skills system:
- Skills can access memory during execution
- Memory preferences influence skill selection
- Skills can store results in memory for future use

### MCP Integration
Memory context is available to MCP tools:
- External tools can access user preferences
- MCP tool results can be stored in memory
- Memory provides context for external tool operations

This memory system ensures that Adelie Agent provides personalized, context-aware interactions without requiring manual memory management commands.
