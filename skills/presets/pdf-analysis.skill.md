# Skill: pdf-document-analysis

## Description
Extract and analyze content from PDF documents

## When to use
- User wants to extract text from PDF files
- User asks to analyze PDF document content
- User needs to summarize or process PDF information

## Inputs
- file_path: Path to the PDF file to analyze
- extract_images: Whether to extract images (optional, defaults to false)

## Plan Template
```json
[
  {
    "action": "MCP_RUN",
    "args": {
      "server": "pdf-reader",
      "tool": "extract_text",
      "input": {
        "file_path": "$$input.file_path",
        "extract_images": "$$input.extract_images"
      }
    },
    "id": "pdf_content"
  },
  {
    "action": "MCP_RUN",
    "args": {
      "server": "sequential-thinking",
      "tool": "think",
      "input": {
        "thought": "Analyze the extracted PDF content and provide a comprehensive summary of the key information"
      }
    }
  }
]
```

## Example
User: Extract and analyze the content from the research paper.pdf file

## Expected behavior
The skill will extract all text content from the PDF file and provide a comprehensive analysis and summary of the key information, main points, and important findings from the document.

## MCP Server Config
```json
{
  "name": "pdf-reader",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-pdf"
  ],
  "tools": [
    "extract_text",
    "extract_images",
    "get_metadata",
    "extract_tables",
    "search_text"
  ],
  "package": "@modelcontextprotocol/server-pdf"
}
```
