# YI Agent - Local Action-Oriented AI Agent

YI is a deterministic, action-based AI agent designed to execute user commands locally. Unlike typical LLM-based assistants that generate free-form responses, YI enforces a strict separation between task planning, action execution, and response generation. This ensures predictable, reliable behavior—even when running on small models (e.g., 7B). It works cross-platform (Windows, macOS, Linux) and can act as a general-purpose assistant.

---

## Table of Contents

* Architecture Overview
* How YI Works

  * Phase 1: Task Planning (Multi-Step)
  * Phase 2: Action Execution
  * Phase 3: Response Generation
* Available Actions
* Installation
* Usage
* Why This Architecture Works

---

## Architecture Overview

YI Agent is built with a modular Node.js architecture:

* **llm.ts** – Handles all calls to the local LLM
* **planner.ts** – Converts user input into a strict JSON execution plan
* **actions.ts** – Defines all available local actions (filesystem, browser, etc.)
* **executor.ts** – Executes actions sequentially and manages flow state
* **response.ts** – Generates a natural language response from execution results
* **cli/index.ts** – Main loop with a Rich-like TUI for visualization

---

## How YI Works

### Phase 1: Task Planning (Multi-Step)

The user provides a command, which is sent to the Planner.

The LLM analyzes the request and returns a structured JSON plan. If the request is purely conversational, it returns an empty plan.

Example:

```json
{
  "plan": [
    {
      "action": "MAKE_DIRECTORY",
      "args": { "path": "backup" }
    },
    {
      "action": "MOVE_FILE",
      "args": {
        "src": "notes.txt",
        "dest": "backup/notes.txt"
      }
    }
  ]
}
```

---

### Phase 2: Action Execution

The agent iterates through the plan and executes each action.

* Uses **short-circuit logic**: if a critical step fails, execution stops immediately
* Prevents inconsistent system states
* Stores all results in an `executionSummary`

---

### Phase 3: Response Generation

The LLM receives the `executionSummary` and generates a user-friendly response.

* No guessing or hallucination
* Uses real execution data
* Can include contextual system info (time, OS, user)

---

## Available Actions

* `BROWSER_OPEN` – Open a URL or perform a search
* `LIST_FILES` – List directory contents
* `READ_FILE` / `WRITE_FILE` – File operations
* `SYSTEM_TIME` – Get current system time
* `MAKE_DIRECTORY` – Create folders
* `DELETE_FILE` – Remove files
* `COPY_FILE` / `MOVE_FILE` – File manipulation
* `PING_HOST` – Check network connectivity

---

## Installation

1. Install Node.js 20+
2. Install dependencies:

```bash
yarn install
```

3. Run a local model (example with Ollama):

```bash
ollama run qwen2.5:7b
```

---

## Usage

Start the agent:

```bash
yarn dev
```

Example commands:

* "open youtube"
* "list files on my desktop"
* "create a folder called photos and move image.png there"

---

## Why This Architecture Works

### Determinism

Small models behave like larger ones when constrained to structured JSON outputs.

### Multi-Step Reasoning

Complex tasks are solved by breaking them into atomic, sequential actions.

### Safety

Predefined action catalog eliminates hallucinations and unsafe operations.

### Traceability

Every step is logged and visualized in the TUI, ensuring full transparency.

---

## Summary

YI Agent is a fully traceable, reliable, and deterministic AI assistant for local automation and general-purpose command execution.
