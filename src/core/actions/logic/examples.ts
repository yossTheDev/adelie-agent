export const getLogicExamples = () => {
  return `LOGIC & CONTROL FLOW EXAMPLES:

User: check if a directory is empty
{
  "plan": [
    {"id": "l1", "action": "LIST_FILES", "args": {"path": "./docs"}},
    {"id": "c1", "action": "IS_EMPTY", "args": {"data": "$$l1"}}
  ]
}

User: count all .txt files in ./logs
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./logs", "pattern": "\\\\.txt$"}},
    {"id": "cnt1", "action": "COUNT", "args": {"items": "$$f1"}}
  ]
}

User: check if a file list contains 'important.txt'
{
  "plan": [
    {"id": "f1", "action": "LIST_FILES", "args": {"path": "./docs"}},
    {"id": "chk1", "action": "CONTAINS", "args": {"data": "$$f1", "value": "important.txt"}}
  ]
}

User: execute actions for each file in ./data
{
  "plan": [
    {"id": "f1", "action": "LIST_FILES", "args": {"path": "./data"}},
    {
      "id": "loop1",
      "action": "FOR_EACH",
      "args": {
        "items": "$$f1",
        "template": [
          {"id": "r1", "action": "READ_FILE", "args": {"path": "$$item"}},
          {"id": "s1", "action": "STATE_APPEND", "args": {"key": "data_buffer", "content": "$$r1"}}
        ]
      }
    },
    {"id": "g1", "action": "STATE_GET", "args": {"key": "data_buffer"}}
  ]
}

User: conditional execution - only summarize if buffer is not empty
{
  "plan": [
    {"id": "g1", "action": "STATE_GET", "args": {"key": "data_buffer"}},
    {
      "id": "if1",
      "action": "IF",
      "args": {
        "condition": "NOT EMPTY",
        "then": [
          {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Summarize the collected content", "content": "$$g1"}}
        ],
        "else": [
          {"id": "msg1", "action": "AI_TRANSFORM", "args": {"task": "Return message 'No data to summarize'", "content": ""}}
        ]
      }
    }
  ]
}

User: repeat reading and appending until all files in ./pending are processed
{
  "plan": [
    {"id": "f1", "action": "LIST_FILES", "args": {"path": "./pending"}},
    {
      "id": "while1",
      "action": "WHILE",
      "args": {
        "condition": "Items remaining in $$f1",
        "body": [
          {"id": "next1", "action": "FOR_EACH", "args": {
            "items": "$$f1",
            "template": [
              {"id": "r1", "action": "READ_FILE", "args": {"path": "$$item"}},
              {"id": "s1", "action": "STATE_APPEND", "args": {"key": "pending_buffer", "content": "$$r1"}}
            ]
          }}
        ]
      }
    }
  ]
}

User: check if a folder is empty and create files if true
{
  "plan": [
    {"id": "c1", "action": "CHECK_EXISTS", "args": {"path": "C:\\Users\\Documents"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "Folder is empty", "data": "$$c1"}},
    {
      "id": "f1",
      "action": "FOR_EACH",
      "args": {
        "items": ["File1.txt","File2.txt","File3.txt","File4.txt","File5.txt","File6.txt","File7.txt","File8.txt","File9.txt","File10.txt"],
        "template": [
          {"id": "create_$$item","action": "CREATE_FILE","args": {"path": "C:\\Users\\Documents\\$$item","content": ""}}
        ]
      }
    }
  ]
}


KEY RULES:
- Use COUNT to get number of items
- Use IS_EMPTY to detect empty lists or results
- Use CONTAINS to check if a value exists in a list
- FOR_EACH executes a template per item in a list; $$item refers to the current element
- IF allows conditional execution based on boolean results or logical conditions
- WHILE allows repeated execution while a condition is TRUE; beware infinite loops
- LOGIC_GATE triggers execution of the immediately next step based on TRUE/FALSE
- Combine with STATE_APPEND and STATE_GET to accumulate results across loops or conditionals
`;
};
