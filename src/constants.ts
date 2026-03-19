import pkg from "../package.json" with { type: "json" };

export const MCP_SERVER_NAME = "obsidian-mcp";
export const MCP_SERVER_VERSION: string = pkg.version;
