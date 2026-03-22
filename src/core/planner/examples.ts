export const getExamples = () => {
  `EXAMPLES:

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

  User: modify the file config.json to change the version to 2.0
  {
    "plan": [
      {"id": "r1", "action": "READ_FILE", "args": {"path": "./config.json"}},
      {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Change version to 2.0", "content": "$$r1"}},
      {"id": "u1", "action": "UPDATE_FILE", "args": {"path": "./config.json", "content": "$$t1"}}
    ]
  }

  User: translate all .txt files in the logs folder to English
  {
    "plan": [
      {"id": "s1", "action": "FILTER_FILES", "args": {"path": "./logs", "pattern": "\\\\.txt$"}},
      {
        "id": "replan1",
        "action": "AI_REPLAN",
        "args": {
          "originalGoal": "Read each file, translate its content to English, and overwrite the file",
          "contextData": "$$s1"
        }
      }
    ]
  }

  User: move all images from ./downloads to ./images
  {
    "plan": [
      {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./downloads", "pattern": "\\.(jpg|jpeg|png|gif)$"}},
      {"id": "m1", "action": "MOVE_FILES", "args": {"files": "$$f1", "dest": "./images"}}
    ]
  }

  User: summarize the file report.txt and save it as summary.txt
  {
    "plan": [
      {"id": "r1", "action": "READ_FILE", "args": {"path": "./report.txt"}},
      {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Summarize the text", "content": "$$r1"}},
      {"id": "w1", "action": "WRITE_FILE", "args": {"path": "./summary.txt", "content": "$$t1"}}
    ]
  }

  User: CONTEXT: The user wanted: "Translate file names to English". DATA FOUND: "C:/Hola.txt, C:/Mundo.txt"
  {
    "plan": [
      {"id": "d1", "action": "MAKE_DIRECTORY", "args": {"path": "C:/translated"}},
      {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Translate 'Hola.txt' to English", "content": "Hola.txt"}},
      {"id": "c1", "action": "COPY_FILE", "args": {"src": "C:/Hola.txt", "dest": "$$d1"}},
      {"id": "t2", "action": "AI_TRANSFORM", "args": {"task": "Translate 'Mundo.txt' to English", "content": "Mundo.txt"}},
      {"id": "c2", "action": "COPY_FILE", "args": {"src": "C:/Mundo.txt", "dest": "$$d1"}}
    ]
  }

  User: Delete all folders under C:/Documents/test

  {
    "plan": [
      {"id": "d1", "action": "LIST_DIRECTORIES", "args": {"path": " C:/Documents/test"}},
      {
        "id": "replan1",
        "action": "AI_REPLAN",
        "args": {
          "originalGoal": "Delete earch folder under C:/Documents/test",
          "contextData": "$$d1"
        }
      }
    ]
  }

  Replan:

  {
    "plan": [
      {"id": "d1", "action": "DELETE_DIRECTORY", "args": {"path": " C:/Documents/test/test1"}},
      {"id": "d1", "action": "DELETE_DIRECTORY", "args": {"path": " C:/Documents/test/test2"}},
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
