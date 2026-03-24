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

- `adelie config show`
- `adelie config set <key> <value>`
- `adelie config reset`
- `adelie config path`
