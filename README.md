# obsidian-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that gives AI assistants (Claude, and others) direct access to an [Obsidian](https://obsidian.md) vault — read, write, search, and manage folders.

## Features

**11 tools** across 3 categories + 1 prompt:

| Category | Tools |
|---|---|
| Notes | `read_note`, `create_note`, `update_note`, `append_to_note`, `delete_note`, `list_notes` |
| Search | `search_notes`, `search_by_tag` |
| Folders | `list_folders`, `create_folder`, `delete_folder` |

| Prompts | Description |
|---|---|
| `learn` | Generate a professional learning note on a given topic |

> **Note:** The following tool groups exist in the codebase but are currently disabled: `links` (`get_links`, `get_backlinks`, `get_broken_links`, `get_link_graph`), `move` (`move_note`), `frontmatter` (`get_frontmatter`, `update_frontmatter`), `tasks` (`find_tasks`, `get_note_tasks`).

## Requirements

- Node.js >= 22.0.0
- An Obsidian vault on the local filesystem

## Installation

```bash
git clone https://github.com/your-username/obsidian-mcp.git
cd obsidian-mcp
npm i
npm run build
```

## Configuration

The server requires a single environment variable:

```bash
VAULT_PATH=/absolute/path/to/your/obsidian/vault
```

Copy `.env.example` to `.env` and fill in your vault path:

```bash
cp .env.example .env
```

## Usage

### With Claude Desktop

Add the server to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/absolute/path/to/obsidian-mcp/build/index.js"],
      "env": {
        "VAULT_PATH": "/absolute/path/to/your/vault"
      }
    }
  }
}
```

### With Claude Code (CLI)

```bash
VAULT_PATH=/path/to/vault claude mcp add obsidian -- node /path/to/obsidian-mcp/build/index.js
```

Or add it to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/path/to/obsidian-mcp/build/index.js"],
      "env": {
        "VAULT_PATH": "/path/to/your/vault"
      }
    }
  }
}
```

### Run directly

```bash
VAULT_PATH=/path/to/vault npm start
```

### Development

```bash
VAULT_PATH=/path/to/vault npm run dev
```

### MCP Inspector

To explore and test tools interactively in the browser:

```bash
VAULT_PATH=/path/to/vault npm run inspect
```

Opens the MCP Inspector UI at `http://localhost:5173`.

## Tool Reference

### Notes

#### `read_note`
Read the full content of a note, with frontmatter and body returned separately.
```
path  — vault-relative path (e.g. "folder/note" or "note.md")
```

#### `create_note`
Create a new note. Fails if the note already exists.
```
path         — vault-relative path
content      — Markdown body
frontmatter  — optional YAML fields (e.g. { tags: ["idea"] })
```

#### `update_note`
Overwrite a note's body. Existing frontmatter is preserved unless a new one is provided.
```
path         — vault-relative path
content      — new Markdown body
frontmatter  — optional; replaces existing if provided
```

#### `append_to_note`
Append text to the end of an existing note.
```
path     — vault-relative path
content  — text to append
```

#### `delete_note`
Permanently delete a note from the vault.
```
path  — vault-relative path
```

#### `list_notes`
List notes in the vault or a subfolder.
```
folder     — optional subfolder; omit to list the entire vault
recursive  — include subfolders (default: true)
```

---

### Search

#### `search_notes`
Full-text search across note bodies. Returns matching lines with line numbers.
```
query   — search string (case-insensitive)
folder  — optional subfolder to limit the search
```

#### `search_by_tag`
Find all notes containing a specific tag in YAML frontmatter or inline as `#tag`.
```
tag     — tag to search (with or without "#", e.g. "idea" or "#idea")
folder  — optional subfolder to limit the search
```

---

### Folders

#### `list_folders`
List directories in the vault or a subfolder.
```
folder     — optional subfolder; omit for vault root
recursive  — include nested subdirectories (default: false)
```

#### `create_folder`
Create a new folder. Fails if the folder already exists.
```
path  — vault-relative path
```

#### `delete_folder`
Delete a folder. Fails if not empty unless `force` is set.
```
path   — vault-relative path
force  — delete recursively even if not empty (default: false)
```

---

## Prompt Reference

### `learn`
Generates a prompt to create a professional learning note in the vault on a given topic.
```
topic  — the subject of the learning note
```
The generated note includes: a concise presentation of the topic, authoritative sources, and a wikilink added to the existing training index. No frontmatter or internal wikilinks to non-existent notes.

---

## Development Tooling

- **Biome** — formatting and linting (`npm run format`, `npm run lint`, `npm run check`)
- **Husky + lint-staged** — pre-commit hooks that run Biome on staged files
- **Commitizen** — conventional commits via `npm run commit`

---

## Security

All path operations are validated against the vault root. Attempts to access files outside `VAULT_PATH` (e.g. via `../` traversal) are rejected with an error.

## License

MIT
