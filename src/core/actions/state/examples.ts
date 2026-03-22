export const getStateExamples = () => {
  return `STATE MANAGEMENT EXAMPLES:

User: read all .txt files in ./docs and give me a single summary
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./docs", "pattern": "\\\\.txt$"}},
    {
      "id": "replan1",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "Read each file and use STATE_APPEND with key 'docs_buffer' to store content",
        "contextData": "$$f1"
      }
    },
    {"id": "g1", "action": "STATE_GET", "args": {"key": "docs_buffer"}},
    {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Summarize all collected content", "content": "$$g1"}}
  ]
}

User: CONTEXT: Read each file and store content in 'docs_buffer'. DATA FOUND: "C:/a.txt, C:/b.txt"
{
  "plan": [
    {"id": "r1", "action": "READ_FILE", "args": {"path": "C:/a.txt"}},
    {"id": "s1", "action": "STATE_APPEND", "args": {"key": "docs_buffer", "content": "$$r1"}},
    {"id": "r2", "action": "READ_FILE", "args": {"path": "C:/b.txt"}},
    {"id": "s2", "action": "STATE_APPEND", "args": {"key": "docs_buffer", "content": "$$r2"}}
  ]
}

User: collect the names of all files in ./logs and return them together
{
  "plan": [
    {"id": "l1", "action": "LIST_FILES", "args": {"path": "./logs"}},
    {
      "id": "replan1",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "For each file name, use STATE_APPEND with key 'names_buffer'",
        "contextData": "$$l1"
      }
    },
    {"id": "g1", "action": "STATE_GET", "args": {"key": "names_buffer"}}
  ]
}

User: CONTEXT: Save each item into 'names_buffer'. DATA FOUND: "file1.txt, file2.txt"
{
  "plan": [
    {"id": "s1", "action": "STATE_APPEND", "args": {"key": "names_buffer", "content": "file1.txt"}},
    {"id": "s2", "action": "STATE_APPEND", "args": {"key": "names_buffer", "content": "file2.txt"}}
  ]
}

User: read two files and combine their content
{
  "plan": [
    {"id": "r1", "action": "READ_FILE", "args": {"path": "./a.txt"}},
    {"id": "s1", "action": "STATE_APPEND", "args": {"key": "merge_buffer", "content": "$$r1"}},
    {"id": "r2", "action": "READ_FILE", "args": {"path": "./b.txt"}},
    {"id": "s2", "action": "STATE_APPEND", "args": {"key": "merge_buffer", "content": "$$r2"}},
    {"id": "g1", "action": "STATE_GET", "args": {"key": "merge_buffer"}}
  ]
}

User: extract important lines from multiple files and summarize them
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./data", "pattern": "\\\\.txt$"}},
    {
      "id": "replan1",
      "action": "AI_REPLAN",
      "args": {
        "originalGoal": "Read each file, extract important lines, and store them using STATE_APPEND with key 'important_buffer'",
        "contextData": "$$f1"
      }
    },
    {"id": "g1", "action": "STATE_GET", "args": {"key": "important_buffer"}},
    {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Summarize the important lines", "content": "$$g1"}}
  ]
}

User: store multiple independent values and retrieve them later
{
  "plan": [
    {"id": "s1", "action": "STATE_APPEND", "args": {"key": "temp", "content": "Value 1"}},
    {"id": "s2", "action": "STATE_APPEND", "args": {"key": "temp", "content": "Value 2"}},
    {"id": "s3", "action": "STATE_APPEND", "args": {"key": "temp", "content": "Value 3"}},
    {"id": "g1", "action": "STATE_GET", "args": {"key": "temp"}}
  ]
}

KEY RULES:
- Use STATE_APPEND to accumulate data across multiple steps
- Use STATE_GET to retrieve ALL accumulated data at once
- ALWAYS use the same key to group related data
- STATE_APPEND is ideal when processing multiple items (files, lists, results)
- Avoid using STATE when simple data piping ($$) is enough
- Use STATE when combining MANY results into ONE final output

`;
};
