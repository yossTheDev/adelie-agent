import { getFSExamples } from "../actions/file-system/examples.js";

export const getExamples = () => {
  `EXAMPLES:

  ${getFSExamples()}

  User: Hello, who are you?
  {
    "plan": []
  }

  User: create a new file named notes.txt with the text "Hello World"
  {
    "plan": [
      {"id": "c1", "action": "CREATE_FILE", "args": {"path": "./notes.txt", "content": "Hello World"}}
    ]
  }

  DATA PIPING RULES:
  - Use "$$id" to inject the output of a previous step into the arguments of a current step.
  - NEVER use "$$" inside strings.
  - ALWAYS use "$$" when referencing previous results.

  EXAMPLE DATA PIPING:

  User: Find all .log files in ./tmp, read "error.log" and then delete all those found .log files.
  {
    "plan": [
      {
        "id": "search_logs",
        "action": "FILTER_FILES",
        "args": {"path": "./tmp", "pattern": "\\\\.log$"}
      },
      {
        "id": "read_error",
        "action": "READ_FILE",
        "args": {"path": "./tmp/error.log"}
      },
      {
        "id": "cleanup",
        "action": "DELETE_FILES",
        "args": {"files": "$$search_logs"}
      }
    ]
  }

  User: Read all .txt files in ./docs and give me a single summary of everything.
  {
    "plan": [
      {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./docs", "pattern": "\\\\.txt$"}},
      {
        "id": "collect",
        "action": "AI_REPLAN",
        "args": {
          "originalGoal": "Read each file and use STATE_APPEND with key 'docs_buffer' to save their content",
          "contextData": "$$f1"
        }
      },
      {"id": "merged", "action": "STATE_GET", "args": {"key": "docs_buffer"}},
      {"id": "final_sum", "action": "AI_SUMMARIZE", "args": {"content": "$$merged"}}
    ]
  }

  User: CONTEXT: Read each file and use STATE_APPEND with key 'docs_buffer'. DATA FOUND: "C:/a.txt, C:/b.txt"
  {
    "plan": [
      {"id": "r1", "action": "READ_FILE", "args": {"path": "C:/a.txt"}},
      {"id": "s1", "action": "STATE_APPEND", "args": {"key": "docs_buffer", "content": "$$r1"}},
      {"id": "r2", "action": "READ_FILE", "args": {"path": "C:/b.txt"}},
      {"id": "s2", "action": "STATE_APPEND", "args": {"key": "docs_buffer", "content": "$$r2"}}
    ]
  }

  CONDITIONAL EXAMPLES:

  User: If the file 'status.txt' contains 'ERROR', delete it.
  {
    "plan": [
      {"id": "r1", "action": "READ_FILE", "args": {"path": "./status.txt"}},
      {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "Contains the word ERROR", "data": "$$r1"}},
      {"id": "d1", "action": "DELETE_FILE", "args": {"path": "./status.txt"}}
    ]
  }

  User: If the file exists, update it with "Hello"
  {
    "plan": [
      {"id": "c1", "action": "CHECK_EXISTS", "args": {"path": "./file.txt"}},
      {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The file exists", "data": "$$c1"}},
      {"id": "u1", "action": "UPDATE_FILE", "args": {"path": "./file.txt", "content": "Hello"}}
    ]
  }

  User: If there are any .txt files in ./docs, delete them
  {
    "plan": [
      {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./docs", "pattern": "\\\\.txt$"}},
      {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The list is NOT empty", "data": "$$f1"}},
      {"id": "d1", "action": "DELETE_FILES", "args": {"files": "$$f1"}}
    ]
  }`;
};
