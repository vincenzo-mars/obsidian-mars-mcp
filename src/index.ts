#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerFrontmatterTools } from "./tools/frontmatter.js";
import { registerLinkTools } from "./tools/links.js";
import { registerNoteTools } from "./tools/notes.js";
import { registerSearchTools } from "./tools/search.js";
import { checkVaultExists, VAULT_PATH } from "./vault.js";

async function main(): Promise<void> {
  // Verifica che la vault esista prima di avviare il server
  await checkVaultExists();

  const server = new McpServer({
    name: "obsidian-mcp",
    version: "1.0.0",
  });

  // Registra tutti i tool
  registerNoteTools(server);
  registerSearchTools(server);
  registerFrontmatterTools(server);
  registerLinkTools(server);

  // Avvia con trasporto stdio (standard per MCP locale)
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log su stderr (NON stdout — altrimenti corrompe JSON-RPC)
  console.info(`obsidian-mcp avviato. Vault: ${VAULT_PATH}`);
}

main().catch((err) => {
  console.error("Errore fatale:", err);
  process.exit(1);
});
