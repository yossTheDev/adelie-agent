# Configuration

User configuration is stored at:

- `~/.adelie/config.json`

## Fields

- `model` - Ollama model name
- `ollama_url` - Ollama API endpoint
- `debug` - Enable additional diagnostics
- `max_loop_iterations` - Safety bound for `WHILE`
- `language` - Preferred language mode (`auto` or explicit)

## CLI Commands

- `yi config show`
- `yi config set <key> <value>`
- `yi config reset`
- `yi config path`
