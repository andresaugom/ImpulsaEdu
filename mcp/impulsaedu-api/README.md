# ImpulsaEdu API — MCP Server

An MCP (Model Context Protocol) server that exposes the ImpulsaEdu backend API
contracts as structured tools for AI coding agents. It allows agents to query
endpoint specs, TypeScript types, and implementation status without parsing a
large markdown file.

## Tools

| Tool | Description |
|------|-------------|
| `list_endpoints` | List all endpoints with method, path, auth, and implementation status |
| `get_endpoint_details` | Full spec for a single endpoint (request body, response, error codes) |
| `get_typescript_types` | TypeScript interfaces for a resource (`auth`, `user`, `school`, `donor`, `donation`, `report`, `xlsx`) |
| `get_implementation_status` | What's already in `frontend/src/lib/` vs what needs to be built |
| `get_service_pattern` | Service file template and key rules followed by existing files |

## Installation

```bash
cd mcp/impulsaedu-api
npm install
```

## Running

```bash
node server.js
```

The server uses **stdio transport** (stdin/stdout), as required by the MCP
protocol for local tool servers.

## Configuring for GitHub Copilot Coding Agent

Add the following to your repository's Copilot coding agent MCP configuration.
In the GitHub UI: **Repository Settings → Copilot → Coding agent → MCP servers**.

```json
{
  "mcpServers": {
    "impulsaedu-api": {
      "type": "stdio",
      "command": "node",
      "args": ["mcp/impulsaedu-api/server.js"],
      "description": "ImpulsaEdu API documentation and implementation status"
    }
  }
}
```

## Configuring for GitHub Copilot CLI

Use the `/mcp add` slash command inside an active Copilot CLI session and fill
in the prompted fields, then press **Ctrl+S** to save.

Alternatively, edit `~/.copilot/mcp-config.json` directly (create the file if
it doesn't exist):

```json
{
  "mcpServers": {
    "impulsaedu-api": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/ImpulsaEdu/mcp/impulsaedu-api/server.js"],
      "description": "ImpulsaEdu API documentation and implementation status"
    }
  }
}
```

Replace `/absolute/path/to/ImpulsaEdu` with the actual path to your local
clone (e.g. `$HOME/git/ImpulsaEdu`). The default config directory is
`~/.copilot/`; override it with the `COPILOT_HOME` environment variable if
needed.

Verify the server is loaded by running `/mcp` inside a Copilot CLI session.

## Configuring for VS Code Copilot

Add to your project's `.vscode/mcp.json`:

```json
{
  "servers": {
    "impulsaedu-api": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/mcp/impulsaedu-api/server.js"]
    }
  }
}
```

## Example Usage (agent perspective)

```
> list_endpoints { "not_implemented_only": true }
→ Returns the 12 endpoints not yet in frontend/src/lib/

> get_endpoint_details { "endpoint_id": "donations.create" }
→ Returns full request body schema, response shape, and error codes

> get_typescript_types { "resource": "donation" }
→ Returns all TypeScript interfaces for donations

> get_implementation_status {}
→ Returns implemented files + exports, missing files, and partially-done files

> get_service_pattern {}
→ Returns the service file template with special-case examples (CSV, binary, multipart)
```
