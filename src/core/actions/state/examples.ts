export const getStateExamples = () => {
  return `STATE MANAGEMENT EXAMPLES (NEW FORMAT):

User: read all .txt files in ./docs and give me a single summary
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./docs", "pattern": "\\\\.txt$"}},
    {
      "id": "for1",
      "action": "FOR_EACH",
      "args": {
        "items": "$$f1",
        "template": [
          {"id": "r", "action": "READ_FILE", "args": {"path": "$$item"}},
          {"id": "s", "action": "STATE_APPEND", "args": {"key": "docs_buffer", "content": "$$r"}}
        ]
      }
    },
    {"id": "g1", "action": "STATE_GET", "args": {"key": "docs_buffer"}},
    {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Summarize all collected content", "content": "$$g1"}}
  ]
}

User: collect the names of all files in ./logs and return them together
{
  "plan": [
    {"id": "l1", "action": "LIST_FILES", "args": {"path": "./logs"}},
    {
      "id": "for1",
      "action": "FOR_EACH",
      "args": {
        "items": "$$l1",
        "template": [
          {"id": "s", "action": "STATE_APPEND", "args": {"key": "names_buffer", "content": "$$item"}}
        ]
      }
    },
    {"id": "g1", "action": "STATE_GET", "args": {"key": "names_buffer"}}
  ]
}

User: read two files and combine their content
{
  "plan": [
    {
      "id": "for1",
      "action": "FOR_EACH",
      "args": {
        "items": ["./a.txt", "./b.txt"],
        "template": [
          {"id": "r", "action": "READ_FILE", "args": {"path": "$$item"}},
          {"id": "s", "action": "STATE_APPEND", "args": {"key": "merge_buffer", "content": "$$r"}}
        ]
      }
    },
    {"id": "g1", "action": "STATE_GET", "args": {"key": "merge_buffer"}}
  ]
}

User: extract important lines from multiple files and summarize them
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./data", "pattern": "\\\\.txt$"}},
    {
      "id": "for1",
      "action": "FOR_EACH",
      "args": {
        "items": "$$f1",
        "template": [
          {"id": "r", "action": "READ_FILE", "args": {"path": "$$item"}},
          {"id": "s", "action": "STATE_APPEND", "args": {"key": "important_buffer", "content": "$$r"}}
        ]
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
- FOR_EACH replaces AI_REPLAN for iterating over lists
- Avoid using STATE when simple data piping ($$) is enough
- Use STATE when combining MANY results into ONE final output
`;
};
