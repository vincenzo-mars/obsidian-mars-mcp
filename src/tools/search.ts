import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fg from "fast-glob";
import matter from "gray-matter";
import { z } from "zod";
import { resolvePath, VAULT_PATH } from "../vault-utils.js";

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    "search_notes",
    {
      description:
        "Ricerca full-text nel contenuto delle note. Restituisce le note che contengono la query con un estratto del contesto.",
      inputSchema: {
        query: z.string().describe("Testo da cercare (case-insensitive)"),
        folder: z.string().optional().describe("Limita la ricerca a una sottocartella della vault"),
      },
    },
    async ({ query, folder }) => {
      const base = folder ? resolvePath(folder, false) : VAULT_PATH;
      const files = await fg("**/*.md", {
        cwd: base,
        onlyFiles: true,
        dot: false,
      });
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

      const results: Array<{
        path: string;
        matches: Array<{ line: number; text: string }>;
      }> = [];

      for (const file of files) {
        const absPath = path.join(base, file);
        const raw = await fs.readFile(absPath, "utf-8");
        const { content } = matter(raw);
        const lines = content.split("\n");
        const matches: Array<{ line: number; text: string }> = [];

        lines.forEach((line, idx) => {
          if (regex.test(line)) {
            matches.push({ line: idx + 1, text: line.trim() });
          }
          regex.lastIndex = 0;
        });

        if (matches.length > 0) {
          const relPath = folder ? path.join(folder, file) : file;
          results.push({ path: relPath, matches });
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ query, count: results.length, results }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "search_by_tag",
    {
      description:
        "Trova tutte le note che contengono un tag specifico nel frontmatter YAML o nel corpo come #tag.",
      inputSchema: {
        tag: z.string().describe("Tag da cercare (con o senza '#', es. 'idea' oppure '#idea')"),
        folder: z.string().optional().describe("Limita la ricerca a una sottocartella della vault"),
      },
    },
    async ({ tag, folder }) => {
      const cleanTag = tag.startsWith("#") ? tag.slice(1) : tag;
      const base = folder ? resolvePath(folder, false) : VAULT_PATH;
      const files = await fg("**/*.md", {
        cwd: base,
        onlyFiles: true,
        dot: false,
      });
      const inlineRegex = new RegExp(`(?:^|\\s)#${cleanTag}(?:\\s|$)`, "m");

      const notes: string[] = [];

      for (const file of files) {
        const absPath = path.join(base, file);
        const raw = await fs.readFile(absPath, "utf-8");
        const { data: frontmatter, content } = matter(raw);

        const inFrontmatter =
          Array.isArray(frontmatter.tags) &&
          frontmatter.tags.some(
            (t: unknown) => typeof t === "string" && t.toLowerCase() === cleanTag.toLowerCase(),
          );

        const inBody = inlineRegex.test(content);

        if (inFrontmatter || inBody) {
          const relPath = folder ? path.join(folder, file) : file;
          notes.push(relPath);
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ tag: cleanTag, count: notes.length, notes }, null, 2),
          },
        ],
      };
    },
  );
}
