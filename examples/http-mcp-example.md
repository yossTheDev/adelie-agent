# Ejemplo de configuración MCP con HTTP

Para instalar un servidor MCP que usa el protocolo HTTP/HTTPS como el de GitHub Copilot API:

## Método 1: Usando el comando install con parámetros HTTP

```bash
# Instalar servidor GitHub con HTTP transport
adelie mcp install github-http "https://api.githubcopilot.com/mcp/" --type=http --url="https://api.githubcopilot.com/mcp/" --auth=bearer --token="${GITHUB_PERSONAL_ACCESS_TOKEN}"
```

## Método 2: Editando directamente el archivo de configuración

El archivo de configuración se encuentra en: `~/.adelie/mcp-config.json`

```json
{
  "servers": [
    {
      "name": "github-http",
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"
      },
      "tools": [],
      "env": {},
      "installed_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Características soportadas

- **Tipo de transporte**: `stdio` (por defecto) o `http`
- **Autenticación**: `bearer` o `basic`
- **Headers personalizados**: Se pueden agregar headers adicionales
- **Variables de entorno**: Se reemplazan automáticamente en URLs y tokens

## Ejemplos de configuración

### Basic Auth
```json
{
  "name": "my-server",
  "type": "http",
  "url": "https://api.example.com/mcp/",
  "auth": {
    "type": "basic",
    "username": "user",
    "password": "pass"
  }
}
```

### Bearer Token con headers adicionales
```json
{
  "name": "my-server",
  "type": "http", 
  "url": "https://api.example.com/mcp/",
  "auth": {
    "type": "bearer",
    "token": "${API_TOKEN}"
  },
  "headers": {
    "X-Custom-Header": "value",
    "Content-Type": "application/json"
  }
}
```
