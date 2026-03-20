# obsidian-mars-mcp

MCP server that gives AI assistants (Claude, and others) direct access to an [Obsidian](https://obsidian.md) vault — read, write, search, and manage notes and folders.

## Requirements

- Node.js >= 22.0.0
- An Obsidian vault on the local filesystem

## Installation

```bash
git clone https://github.com/vincenzo-mars/obsidian-mars-mcp.git
cd obsidian-mars-mcp
npm ci
npm run build
```

## Configuration

Set your vault path via environment variable:

```bash
VAULT_PATH=/absolute/path/to/your/vault
```

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

## Usage

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/absolute/path/to/obsidian-mars-mcp/build/index.js"],
      "env": {
        "VAULT_PATH": "/absolute/path/to/your/vault"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add obsidian -- node /path/to/obsidian-mars-mcp/build/index.js
```

Or add to `.mcp.json`:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/path/to/obsidian-mars-mcp/build/index.js"],
      "env": {
        "VAULT_PATH": "/path/to/your/vault"
      }
    }
  }
}
```

## Tools

| Category | Tools |
|---|---|
| Notes | `read_note`, `create_note`, `update_note`, `append_to_note`, `delete_note`, `list_notes` |
| Search | `search_notes`, `search_by_tag` |
| Folders | `list_folders`, `create_folder`, `delete_folder` |

## Prompts

| Name | Description |
|---|---|
| `learn` | Generate a professional learning note on a given topic |

## MCP Inspector

Test and explore tools interactively in the browser:

```bash
VAULT_PATH=/path/to/vault npm run inspect
```

Opens the MCP Inspector UI at `http://localhost:5173`. From there you can call any tool manually and inspect inputs/outputs.

## Development

```bash
# Run in watch mode
VAULT_PATH=/path/to/vault npm run dev

# Inspect tools interactively in the browser
VAULT_PATH=/path/to/vault npm run inspect

# Lint & format
npm run check

# Commit (conventional commits)
npm run commit
```

## Security

All path operations are validated against the vault root. Attempts to access files outside `VAULT_PATH` are rejected.

## License

MIT
