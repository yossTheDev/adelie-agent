# Skill: database-query-and-analyze

## Description
Execute SQL queries on databases and analyze the results

## When to use
- User wants to query a SQLite or PostgreSQL database
- User asks to analyze data or retrieve specific records
- User needs to perform database operations and get insights

## Inputs
- database_type: Type of database (sqlite, postgres)
- database_path: Path to SQLite file or connection string for PostgreSQL
- query: SQL query to execute

## Plan Template
```json
[
  {
    "action": "MCP_RUN",
    "args": {
      "server": "$$input.database_type",
      "tool": "execute_query",
      "input": {
        "database": "$$input.database_path",
        "query": "$$input.query"
      }
    },
    "id": "query_result"
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "sequential-thinking",
      "tool": "think",
      "input": {
        "thought": "Analyze the query results and provide insights about the data: $$query_result"
      }
    }
  }
]
```

## Example
User: Query the SQLite database at ./data.db to get all users who signed up in the last month

## Expected behavior
The skill will execute the SQL query on the specified database and provide a comprehensive analysis of the results, including insights about the data patterns and trends.

## MCP Server Config
```json
{
  "name": "sqlite",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-sqlite"
  ],
  "tools": [
    "execute_query",
    "create_table",
    "insert_data",
    "update_data",
    "delete_data",
    "get_schema"
  ],
  "package": "@modelcontextprotocol/server-sqlite"
}
```
