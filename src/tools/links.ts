import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fg from "fast-glob";
import * as fs from "fs/promises";
import matter from "gray-matter";
import * as path from "path";
import { z } from "zod";
import { resolvePath, VAULT_PATH } from "../vault-utils.js";

function extractWikilinks(content: string): string[] {
  const regex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  return [...new Set(links)];
}

async function resolveWikilink(
  noteName: string,
  allFiles: string[],
): Promise<string | null> {
  const nameWithExt = noteName.endsWith(".md") ? noteName : noteName + ".md";
  const exact = allFiles.find(
    (f) => f === nameWithExt || path.basename(f) === nameWithExt,
  );
  return exact ?? null;
}

export function registerLinkTools(server: McpServer): void {
  server.registerTool(
    "get_links",
    {
      description: "Restituisce tutti i [[wikilink]] in uscita da una nota.",
      inputSchema: {
        path: z.string().describe("Path della nota relativo alla vault"),
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
      const { content } = matter(raw);
      const links = extractWikilinks(content);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { path: notePath, count: links.length, links },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_backlinks",
    {
      description:
        "Trova tutte le note che linkano a una nota specifica tramite [[wikilink]].",
      inputSchema: {
        note_name: z
          .string()
          .describe(
            "Nome della nota da cercare come destinazione (con o senza .md, es. 'MiaNota')",
          ),
      },
    },
    async ({ note_name }) => {
      const targetBase = path.basename(note_name, ".md");
      const allFiles = await fg("**/*.md", {
        cwd: VAULT_PATH,
        onlyFiles: true,
        dot: false,
      });
      const backlinks: string[] = [];

      for (const file of allFiles) {
        const absPath = path.join(VAULT_PATH, file);
        const raw = await fs.readFile(absPath, "utf-8");
        const { content } = matter(raw);
        const links = extractWikilinks(content);
        const found = links.some(
          (l) =>
            path.basename(l, ".md").toLowerCase() === targetBase.toLowerCase(),
        );
        if (found) backlinks.push(file);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { note: note_name, count: backlinks.length, backlinks },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_broken_links",
    {
      description:
        "Trova tutti i [[wikilink]] che puntano a note inesistenti nella vault.",
      inputSchema: {
        folder: z
          .string()
          .optional()
          .describe("Limita la ricerca a una sottocartella della vault"),
      },
    },
    async ({ folder }) => {
      const base = folder ? resolvePath(folder, false) : VAULT_PATH;
      const allFiles = await fg("**/*.md", {
        cwd: VAULT_PATH,
        onlyFiles: true,
        dot: false,
      });
      const searchFiles = folder
        ? await fg("**/*.md", { cwd: base, onlyFiles: true, dot: false }).then(
            (f) => f.map((x) => path.join(folder, x)),
          )
        : allFiles;

      const broken: Array<{ source: string; link: string }> = [];

      for (const file of searchFiles) {
        const absPath = path.join(VAULT_PATH, file);
        const raw = await fs.readFile(absPath, "utf-8");
        const { content } = matter(raw);
        const links = extractWikilinks(content);

        for (const link of links) {
          const resolved = await resolveWikilink(link, allFiles);
          if (!resolved) {
            broken.push({ source: file, link });
          }
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: broken.length, broken }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_link_graph",
    {
      description:
        "Restituisce il grafo delle relazioni tra note come lista di archi { source, target }. " +
        "Utile per visualizzare connessioni o analizzare la struttura della vault.",
      inputSchema: {
        folder: z
          .string()
          .optional()
          .describe("Limita il grafo a una sottocartella della vault"),
        depth: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .default(1)
          .describe("Profondità massima del grafo (1 = solo link diretti)."),
      },
    },
    async ({ folder }) => {
      const base = folder ? resolvePath(folder, false) : VAULT_PATH;
      const allFiles = await fg("**/*.md", {
        cwd: VAULT_PATH,
        onlyFiles: true,
        dot: false,
      });
      const scopeFiles = folder
        ? await fg("**/*.md", { cwd: base, onlyFiles: true, dot: false }).then(
            (f) => f.map((x) => path.join(folder, x)),
          )
        : allFiles;

      const nodes = new Set<string>();
      const edges: Array<{ source: string; target: string }> = [];

      for (const file of scopeFiles) {
        nodes.add(file);
        const absPath = path.join(VAULT_PATH, file);
        const raw = await fs.readFile(absPath, "utf-8");
        const { content } = matter(raw);
        const links = extractWikilinks(content);

        for (const link of links) {
          const resolved = await resolveWikilink(link, allFiles);
          if (resolved) {
            nodes.add(resolved);
            edges.push({ source: file, target: resolved });
          }
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                nodeCount: nodes.size,
                edgeCount: edges.length,
                nodes: [...nodes],
                edges,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
