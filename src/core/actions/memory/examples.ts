export const getMemoryExamples = () => `
MEMORY EXAMPLES:

EXAMPLE 1: Store user preferences with AI processing
USER: "Remember that I prefer dark theme and TypeScript"
PLAN: {
  "plan": [
    {
      "id": "store_prefs",
      "action": "MEMORY_SET",
      "args": {
        "key": "user_preferences",
        "value": "I prefer dark theme and TypeScript",
        "source": "user_input",
        "instruction": "Extract user preferences as structured JSON with theme and language fields"
      }
    }
  ]
}

EXAMPLE 2: Store project information for future reference
USER: "Save this project info: Project Alpha uses React, Node.js, and PostgreSQL"
PLAN: {
  "plan": [
    {
      "id": "store_project",
      "action": "MEMORY_SET",
      "args": {
        "key": "project_alpha_tech_stack",
        "value": "Project Alpha uses React, Node.js, and PostgreSQL",
        "source": "user_input",
        "instruction": "Extract project technology stack as JSON with project_name and technologies array"
      }
    }
  ]
}

EXAMPLE 3: Search stored information
USER: "Find all information about React projects"
PLAN: {
  "plan": [
    {
      "id": "search_react",
      "action": "MEMORY_SEARCH",
      "args": {
        "query": "react"
      }
    }
  ]
}

EXAMPLE 4: Memory with DataPiping in loops
USER: "Save all these technologies: React, Vue, Angular, Svelte"
PLAN: {
  "plan": [
    {
      "id": "tech_list",
      "action": "DATA_TRANSFORM",
      "args": {
        "input": ["React", "Vue", "Angular", "Svelte"],
        "operation": "identity"
      }
    },
    {
      "id": "save_techs",
      "action": "FOR_EACH",
      "args": {
        "items": "$$tech_list",
        "template": [
          {
            "id": "store_tech",
            "action": "MEMORY_SET",
            "args": {
              "key": "technology_$$item",
              "value": "$$item",
              "source": "batch_import"
            }
          }
        ]
      }
    }
  ]
}

EXAMPLE 5: Store and later use structured data
USER: "Remember that John is a frontend developer specializing in React"
PLAN: {
  "plan": [
    {
      "id": "store_john",
      "action": "MEMORY_SET",
      "args": {
        "key": "john_profile",
        "value": "John is a frontend developer specializing in React",
        "source": "user_input",
        "instruction": "Extract person information as JSON with name, role, and specialization fields"
      }
    }
  ]
}

EXAMPLE 6: Clear old memory and store new information
USER: "Update my user profile: I'm now a senior developer"
PLAN: {
  "plan": [
    {
      "id": "clear_old_profile",
      "action": "MEMORY_DELETE",
      "args": {
        "key": "user_profile"
      }
    },
    {
      "id": "store_new_profile",
      "action": "MEMORY_SET",
      "args": {
        "key": "user_profile",
        "value": "senior developer",
        "source": "user_update"
      }
    }
  ]
}

AUTOMATIC MEMORY USAGE:
Memory is automatically loaded and available in responses without needing MEMORY_GET:
- User: "What are my preferences?" → Response uses stored preferences automatically
- User: "Tell me about my projects" → Response uses stored project info automatically
- User: "What do you know about me?" → Response uses all stored information automatically

MEMORY USAGE PATTERNS:
1. USER PROFILES: Store user information with AI processing for structured data
2. PREFERENCES: Save user preferences for personalized responses
3. PROJECT DATA: Keep project information for context-aware assistance
4. CREDENTIALS: Store authentication data (use with caution)
5. LEARNING: Remember corrections and preferences for future interactions
6. CONTEXT: Maintain conversation context across sessions
7. SEARCH & RETRIEVE: Find relevant information when needed
8. BULK OPERATIONS: Combine MEMORY_SET with FOR_EACH for batch storage
9. UPDATES: Use MEMORY_DELETE + MEMORY_SET for updates

BEST PRACTICES:
- Use descriptive keys (e.g., "user_preferences" not "data1")
- Include "source" parameter for tracking
- Use "instruction" parameter with AI for structured data extraction
- Memory is automatically available in responses - no MEMORY_GET needed
- Combine with LOGIC_GATE for conditional behavior
- Use MEMORY_SEARCH to find relevant information
- Clean up old data with MEMORY_DELETE/MEMORY_CLEAR

AUTOMATIC RESPONSE INTEGRATION:
- All stored memory is automatically available in response generation
- The system uses memory context to personalize responses without explicit commands
- MEMORY_GET is not needed - memory is loaded automatically at startup
- Responses naturally incorporate stored information when relevant
`;
