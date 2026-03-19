import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fg from "fast-glob";
import * as fs from "fs/promises";
import matter from "gray-matter";
import * as path from "path";
import { z } from "zod";
import {
  ensureParentDir,
  relativePath,
  resolvePath,
  VAULT_PATH,
} from "../vault.js";

export function registerNoteTools(server: McpServer): void {
  server.registerTool(
    "read_note",
    {
      description:
        "Legge il contenuto completo di una nota Obsidian. Restituisce frontmatter e corpo separati.",
      inputSchema: {
        path: z
          .string()
          .describe(
            "Path della nota relativo alla vault (es. 'folder/nota' o 'nota.md')",
          ),
      },
    },
    async ({ path: notePath }) => {
      const absPath = resolvePath(notePath);
      let raw: string;
      try {
        raw = await fs.readFile(absPath, "utf-8");
      } catch {
        throw new Error(`Nota non trovata: ${notePath}`);
      }
      const { data: frontmatter, content } = matter(raw);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { path: relativePath(absPath), frontmatter, content },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "create_note",
    {
      description: "Crea una nuova nota Obsidian. Errore se la nota esiste già.",
      inputSchema: {
        path: z.string().describe("Path della nota relativo alla vault"),
        content: z.string().describe("Corpo della nota in Markdown"),
        frontmatter: z
          .record(z.unknown())
          .optional()
          .describe("Campi frontmatter YAML opzionali (es. { tags: ['idea'] })"),
      },
    },
    async ({ path: notePath, content, frontmatter }) => {
      const absPath = resolvePath(notePath);
      try {
        await fs.access(absPath);
        throw new Error(`La nota esiste già: ${notePath}`);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.startsWith("La nota esiste già")
        )
          throw err;
      }
      await ensureParentDir(absPath);
      const raw = frontmatter
        ? matter.stringify(content, frontmatter)
        : content;
      await fs.writeFile(absPath, raw, "utf-8");
      return {
        content: [
          {
            type: "text" as const,
            text: `Nota creata: ${relativePath(absPath)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "update_note",
    {
      description:
        "Sovrascrive il contenuto di una nota esistente. Il frontmatter viene preservato se non fornito.",
      inputSchema: {
        path: z.string().describe("Path della nota relativo alla vault"),
        content: z.string().describe("Nuovo corpo della nota in Markdown"),
        frontmatter: z
          .record(z.unknown())
          .optional()
          .describe("Nuovo frontmatter. Se omesso, mantiene quello esistente."),
      },
    },
    async ({ path: notePath, content, frontmatter }) => {
      const absPath = resolvePath(notePath);
      let existingFrontmatter: Record<string, unknown> = {};
      try {
        const raw = await fs.readFile(absPath, "utf-8");
        existingFrontmatter = matter(raw).data;
      } catch {
        throw new Error(`Nota non trovata: ${notePath}`);
      }
      const fm = frontmatter ?? existingFrontmatter;
      const raw =
        Object.keys(fm).length > 0 ? matter.stringify(content, fm) : content;
      await fs.writeFile(absPath, raw, "utf-8");
      return {
        content: [
          {
            type: "text" as const,
            text: `Nota aggiornata: ${relativePath(absPath)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "append_to_note",
    {
      description: "Aggiunge testo in fondo a una nota esistente.",
      inputSchema: {
        path: z.string().describe("Path della nota relativo alla vault"),
        content: z.string().describe("Testo da aggiungere in fondo"),
      },
    },
    async ({ path: notePath, content }) => {
      const absPath = resolvePath(notePath);
      try {
        await fs.access(absPath);
      } catch {
        throw new Error(`Nota non trovata: ${notePath}`);
      }
      await fs.appendFile(absPath, "\n" + content, "utf-8");
      return {
        content: [
          {
            type: "text" as const,
            text: `Testo aggiunto a: ${relativePath(absPath)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "delete_note",
    {
      description: "Elimina definitivamente una nota dalla vault.",
      inputSchema: {
        path: z.string().describe("Path della nota relativo alla vault"),
      },
    },
    async ({ path: notePath }) => {
      const absPath = resolvePath(notePath);
      try {
        await fs.unlink(absPath);
      } catch {
        throw new Error(`Nota non trovata: ${notePath}`);
      }
      return {
        content: [
          {
            type: "text" as const,
            text: `Nota eliminata: ${relativePath(absPath)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "list_notes",
    {
      description: "Elenca le note nella vault o in una sottocartella.",
      inputSchema: {
        folder: z
          .string()
          .optional()
          .describe(
            "Sottocartella relativa alla vault. Ometti per listare tutta la vault.",
          ),
        recursive: z
          .boolean()
          .optional()
          .default(true)
          .describe("Includi sottocartelle (default: true)"),
      },
    },
    async ({ folder, recursive }) => {
      const base = folder ? resolvePath(folder, false) : VAULT_PATH;
      const pattern = recursive ? "**/*.md" : "*.md";
      const files = await fg(pattern, {
        cwd: base,
        onlyFiles: true,
        dot: false,
      });
      const notes = files
        .sort()
        .map((f) => (folder ? path.join(folder, f) : f));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: notes.length, notes }, null, 2),
          },
        ],
      };
    },
  );
}
