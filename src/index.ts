#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./constants.js";
import { registerFrontmatterTools } from "./tools/frontmatter.js";
import { registerLinkTools } from "./tools/links.js";
import { registerNoteTools } from "./tools/notes.js";
import { registerSearchTools } from "./tools/search.js";
import { checkVaultExists, VAULT_PATH } from "./vault.js";

async function main(): Promise<void> {
  await checkVaultExists();

  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  registerNoteTools(server);
  registerSearchTools(server);
  registerFrontmatterTools(server);
  registerLinkTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.info(`obsidian-mcp avviato. Vault: ${VAULT_PATH}`);
}

main().catch((err) => {
  console.error("Errore fatale:", err);
  process.exit(1);
});
