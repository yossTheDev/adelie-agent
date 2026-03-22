export const getFSExamples = () => {
  return `EXAMPLES:

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

User: create a folder called backups
{
  "plan": [
    {"id": "d1", "action": "MAKE_DIRECTORY", "args": {"path": "./backups"}}
  ]
}

User: count how many files are in ./docs
{
  "plan": [
    {"id": "l1", "action": "LIST_FILES", "args": {"path": "./docs"}},
    {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Count how many items are in the list", "content": "$$l1"}}
  ]
}

User: modify the file config.json to change the version to 2.0
{
  "plan": [
    {"id": "c1", "action": "CHECK_EXISTS", "args": {"path": "./config.json"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The file exists", "data": "$$c1"}},
    {"id": "r1", "action": "READ_FILE", "args": {"path": "./config.json"}},
    {"id": "t1", "action": "AI_TRANSFORM", "args": {"task": "Change version to 2.0", "content": "$$r1"}},
    {"id": "u1", "action": "UPDATE_FILE", "args": {"path": "./config.json", "content": "$$t1"}}
  ]
}

User: read the file report.txt
{
  "plan": [
    {"id": "c1", "action": "CHECK_EXISTS", "args": {"path": "./report.txt"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The file exists", "data": "$$c1"}},
    {"id": "r1", "action": "READ_FILE", "args": {"path": "./report.txt"}}
  ]
}

User: list all files in ./logs
{
  "plan": [
    {"id": "l1", "action": "LIST_FILES", "args": {"path": "./logs"}}
  ]
}

User: get all directories inside ./projects
{
  "plan": [
    {"id": "l1", "action": "LIST_DIRECTORIES", "args": {"path": "./projects"}}
  ]
}

User: move file from ./a.txt to ./backup/a.txt
{
  "plan": [
    {"id": "c1", "action": "CHECK_EXISTS", "args": {"path": "./a.txt"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The file exists", "data": "$$c1"}},
    {"id": "m1", "action": "MOVE_FILE", "args": {"src": "./a.txt", "dest": "./backup/a.txt"}}
  ]
}

User: copy all .txt files from ./docs to ./backup
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./docs", "pattern": "\\\\.txt$"}},
    {"id": "c1", "action": "COPY_FILES", "args": {"files": "$$f1", "dest": "./backup"}}
  ]
}

User: delete the file temp.txt
{
  "plan": [
    {"id": "c1", "action": "CHECK_EXISTS", "args": {"path": "./temp.txt"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The file exists", "data": "$$c1"}},
    {"id": "d1", "action": "DELETE_FILE", "args": {"path": "./temp.txt"}}
  ]
}

User: delete all .log files in ./tmp
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./tmp", "pattern": "\\\\.log$"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The list is NOT empty", "data": "$$f1"}},
    {"id": "d1", "action": "DELETE_FILES", "args": {"files": "$$f1"}}
  ]
}

User: rename file ./old.txt to ./new.txt
{
  "plan": [
    {"id": "c1", "action": "CHECK_EXISTS", "args": {"path": "./old.txt"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The file exists", "data": "$$c1"}},
    {"id": "r1", "action": "RENAME_FILE", "args": {"src": "./old.txt", "dest": "./new.txt"}}
  ]
}

User: get stats of file ./data.json
{
  "plan": [
    {"id": "c1", "action": "CHECK_EXISTS", "args": {"path": "./data.json"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The file exists", "data": "$$c1"}},
    {"id": "s1", "action": "GET_FILE_STATS", "args": {"path": "./data.json"}}
  ]
}

User: move all images from ./downloads to ./images
{
  "plan": [
    {"id": "f1", "action": "FILTER_FILES", "args": {"path": "./downloads", "pattern": "\\\\.(jpg|jpeg|png|gif)$"}},
    {"id": "m1", "action": "MOVE_FILES", "args": {"files": "$$f1", "dest": "./images"}}
  ]
}

User: if the file exists, delete it
{
  "plan": [
    {"id": "c1", "action": "CHECK_EXISTS", "args": {"path": "./file.txt"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The file exists", "data": "$$c1"}},
    {"id": "d1", "action": "DELETE_FILE", "args": {"path": "./file.txt"}}
  ]
}

User: if there are any files in ./logs, move them to ./backup
{
  "plan": [
    {"id": "l1", "action": "LIST_FILES", "args": {"path": "./logs"}},
    {"id": "g1", "action": "LOGIC_GATE", "args": {"condition": "The list is NOT empty", "data": "$$l1"}},
    {"id": "m1", "action": "MOVE_FILES", "args": {"files": "$$l1", "dest": "./backup"}}
  ]
}

DATA PIPING RULES:
- Use "$$id" to inject previous results
- NEVER embed "$$" inside strings
- ALWAYS reference dependencies explicitly

`;
};
