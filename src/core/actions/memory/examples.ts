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

EXAMPLE 2: Retrieve and use stored information
USER: "What are my preferred settings?"
PLAN: {
  "plan": [
    {
      "id": "get_prefs",
      "action": "MEMORY_GET",
      "args": {
        "key": "user_preferences"
      }
    }
  ]
}

EXAMPLE 3: Store project information for future reference
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

EXAMPLE 4: Search stored information
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

EXAMPLE 5: Conditional logic using memory
USER: "If I have saved admin credentials, use them, otherwise ask for them"
PLAN: {
  "plan": [
    {
      "id": "check_admin_creds",
      "action": "MEMORY_GET",
      "args": {
        "key": "admin_credentials"
      }
    },
    {
      "id": "has_creds_gate",
      "action": "LOGIC_GATE",
      "args": {
        "condition": "$$check_admin_creds"
      }
    },
    {
      "id": "use_creds",
      "action": "LOGIN",
      "args": {
        "credentials": "$$check_admin_creds"
      }
    }
  ]
}

EXAMPLE 6: Memory with DataPiping in loops
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

EXAMPLE 7: Store and later use structured data
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

EXAMPLE 8: Clear old memory and store new information
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

MEMORY USAGE PATTERNS:
1. USER PROFILES: Store user information with AI processing for structured data
2. PREFERENCES: Save user preferences for personalized responses
3. PROJECT DATA: Keep project information for context-aware assistance
4. CREDENTIALS: Store authentication data (use with caution)
5. LEARNING: Remember corrections and preferences for future interactions
6. CONTEXT: Maintain conversation context across sessions
7. SEARCH & RETRIEVE: Find relevant information when needed
8. CONDITIONAL LOGIC: Use MEMORY_GET + LOGIC_GATE for smart decisions
9. BULK OPERATIONS: Combine MEMORY_SET with FOR_EACH for batch storage
10. UPDATES: Use MEMORY_DELETE + MEMORY_SET for updates

BEST PRACTICES:
- Use descriptive keys (e.g., "user_preferences" not "data1")
- Include "source" parameter for tracking
- Use "instruction" parameter with AI for structured data extraction
- Combine with LOGIC_GATE for conditional behavior
- Use MEMORY_SEARCH to find relevant information
- Clean up old data with MEMORY_DELETE/MEMORY_CLEAR
`;
