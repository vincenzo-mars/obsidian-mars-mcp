# obsidian-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that gives AI assistants (Claude, and others) direct access to an [Obsidian](https://obsidian.md) vault — read, write, search, manage links, folders, and tasks.

## Features

**20 tools** across 7 categories:

| Category | Tools |
|---|---|
| Notes | `read_note`, `create_note`, `update_note`, `append_to_note`, `delete_note`, `list_notes` |
| Search | `search_notes`, `search_by_tag` |
| Frontmatter | `get_frontmatter`, `update_frontmatter` |
| Links | `get_links`, `get_backlinks`, `get_broken_links`, `get_link_graph` |
| Move | `move_note` |
| Folders | `list_folders`, `create_folder`, `delete_folder` |
| Tasks | `find_tasks`, `get_note_tasks` |

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

### Frontmatter

#### `get_frontmatter`
Read the YAML frontmatter of a note as a JSON object.
```
path  — vault-relative path
```

#### `update_frontmatter`
Merge new fields into existing frontmatter. Pass `null` as a value to delete a field.
```
path   — vault-relative path
fields — object with fields to set or delete
```

---

### Links

#### `get_links`
Return all outgoing `[[wikilinks]]` from a note.
```
path  — vault-relative path
```

#### `get_backlinks`
Find all notes that link to a given note.
```
note_name  — target note name (with or without ".md")
```

#### `get_broken_links`
Find all wikilinks pointing to notes that do not exist.
```
folder  — optional subfolder to limit the search
```

#### `get_link_graph`
Return the link graph as a list of `{ source, target }` edges.
```
folder  — optional subfolder to limit the graph
depth   — max depth, 1–5 (default: 1)
```

---

### Move

#### `move_note`
Move or rename a note. Automatically updates all `[[wikilinks]]` pointing to the old name across the entire vault.
```
source_path       — current vault-relative path
destination_path  — new vault-relative path
```
- Same folder → rename
- Different folder → move
- Returns `{ moved_from, moved_to, links_updated }`

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

### Tasks

#### `find_tasks`
Find tasks (`- [ ]` and `- [x]`) across the vault or a folder.
```
status     — "all" | "incomplete" | "complete"
folder     — optional subfolder to limit the search
recursive  — include subfolders (default: true)
```
Returns `{ note_path, line_number, task_text, completed }` for each task.

#### `get_note_tasks`
Get all tasks in a specific note.
```
path  — vault-relative path
```

---

## Security

All path operations are validated against the vault root. Attempts to access files outside `VAULT_PATH` (e.g. via `../` traversal) are rejected with an error.

## License

MIT
