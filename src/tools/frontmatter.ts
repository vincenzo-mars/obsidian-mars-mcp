import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from "fs/promises";
import matter from "gray-matter";
import { z } from "zod";
import { relativePath, resolvePath } from "../vault.js";

export function registerFrontmatterTools(server: McpServer): void {
  // ── get_frontmatter ────────────────────────────────────────────────────────
  server.tool(
    "get_frontmatter",
    "Legge e restituisce il frontmatter YAML di una nota come oggetto JSON.",
    { path: z.string().describe("Path della nota relativo alla vault") },
    async ({ path: notePath }) => {
      const absPath = resolvePath(notePath);
      let raw: string;
      try {
        raw = await fs.readFile(absPath, "utf-8");
      } catch {
        throw new Error(`Nota non trovata: ${notePath}`);
      }
      const { data: frontmatter } = matter(raw);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { path: relativePath(absPath), frontmatter },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ── update_frontmatter ─────────────────────────────────────────────────────
  server.tool(
    "update_frontmatter",
    "Aggiorna o aggiunge campi al frontmatter YAML di una nota (merge non distruttivo). " +
      "I campi esistenti non specificati vengono mantenuti. " +
      "Per rimuovere un campo, impostarlo a null.",
    {
      path: z.string().describe("Path della nota relativo alla vault"),
      fields: z
        .record(z.unknown())
        .describe(
          "Campi da aggiornare/aggiungere. Es: { tags: ['idea', 'todo'], status: 'done' }",
        ),
    },
    async ({ path: notePath, fields }) => {
      const absPath = resolvePath(notePath);
      let raw: string;
      try {
        raw = await fs.readFile(absPath, "utf-8");
      } catch {
        throw new Error(`Nota non trovata: ${notePath}`);
      }
      const parsed = matter(raw);

      const merged: Record<string, unknown> = { ...parsed.data };
      for (const [key, value] of Object.entries(fields)) {
        if (value === null) {
          delete merged[key];
        } else {
          merged[key] = value;
        }
      }

      const updated = matter.stringify(parsed.content, merged);
      await fs.writeFile(absPath, updated, "utf-8");

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { path: relativePath(absPath), frontmatter: merged },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
