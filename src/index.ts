#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./constants.js";
import { registerLearningPrompts } from "./prompts/prompts.js";
import { registerFolderTools } from "./tools/folders.js";
import { registerNoteTools } from "./tools/notes.js";
import { registerSearchTools } from "./tools/search.js";
import { checkVaultExists } from "./vault-utils.js";

async function main(): Promise<void> {
  await checkVaultExists();

  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  registerLearningPrompts(server);
  registerNoteTools(server);
  registerFolderTools(server);
  registerSearchTools(server);
  // registerLinkTools(server);
  // registerMoveTools(server);
  // registerTaskTools(server);
  // registerFrontmatterTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
