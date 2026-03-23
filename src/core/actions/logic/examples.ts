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

User: create numbered files using FOR_EACH with a single template object
{
  "plan": [
    {"id": "mk1", "action": "MAKE_DIRECTORY", "args": {"path": "C:\\\\Users\\\\yoann\\\\Documents"}},
    {
      "id": "loop1",
      "action": "FOR_EACH",
      "args": {
        "items": "1,2,3,4,5",
        "template": {
          "id": "create_$$item",
          "action": "CREATE_FILE",
          "args": {
            "path": "C:\\\\Users\\\\yoann\\\\Documents\\\\text-$$item.txt",
            "content": "This is text file number $$item."
          }
        }
      }
    }
  ]
}

User: conditional execution - only summarize if buffer is not empty
{
  "plan": [
    {"id": "g1", "action": "STATE_GET", "args": {"key": "data_buffer"}},
    {"id": "empty1", "action": "IS_EMPTY", "args": {"data": "$$g1"}},
    {"id": "not1", "action": "NOT", "args": {"value": "$$empty1"}},
    {
      "id": "if1",
      "action": "IF",
      "args": {
        "condition": {
          "action": "AND",
          "args": {
            "a": "$$not1",
            "b": "TRUE"
          }
        },
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

User: conditional execution with numeric comparison
{
  "plan": [
    {"id": "cnt1", "action": "COUNT", "args": {"items": "a,b,c,d"}},
    {"id": "cmp1", "action": "GREATER_THAN", "args": {"a": "$$cnt1", "b": 2}},
    {
      "id": "if1",
      "action": "IF",
      "args": {
        "condition": {
          "action": "AND",
          "args": {
            "a": "$$cmp1",
            "b": "TRUE"
          }
        },
        "then": [
          {"id": "ok1", "action": "AI_TRANSFORM", "args": {"task": "Return 'More than 2 items'", "content": ""}}
        ],
        "else": [
          {"id": "ko1", "action": "AI_TRANSFORM", "args": {"task": "Return '2 or fewer items'", "content": ""}}
        ]
      }
    }
  ]
}

User: repeat while there are files pending (deterministic condition)
{
  "plan": [
    {"id": "f1", "action": "LIST_FILES", "args": {"path": "./pending"}},
    {"id": "cnt1", "action": "COUNT", "args": {"items": "$$f1"}},
    {
      "id": "while1",
      "action": "WHILE",
      "args": {
        "condition": {
          "action": "GREATER_THAN",
          "args": {
            "a": "$$cnt1",
            "b": 0
          }
        },
        "body": [
          {
            "id": "loop1",
            "action": "FOR_EACH",
            "args": {
              "items": "$$f1",
              "template": [
                {"id": "r1", "action": "READ_FILE", "args": {"path": "$$item"}},
                {"id": "s1", "action": "STATE_APPEND", "args": {"key": "pending_buffer", "content": "$$r1"}}
              ]
            }
          }
        ]
      }
    }
  ]
}

KEY RULES:
- Always use deterministic logic gates inside IF/WHILE condition
- condition must be an object: { action, args }
- Prefer IS_EMPTY, COUNT, CONTAINS, EQUALS for base checks
- Compose logic using NOT, AND, OR, XOR, NAND, NOR
- Numeric comparisons: GREATER_THAN, LESS_THAN, etc.
- FOR_EACH uses $$item for current element
- Use STATE_APPEND / STATE_GET to accumulate data
- Avoid free-text conditions like "Items remaining..." → always use explicit actions
`;
};
