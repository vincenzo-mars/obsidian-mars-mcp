import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fg from "fast-glob";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import { relativePath, resolvePath, VAULT_PATH } from "../vault.js";

export function registerFolderTools(server: McpServer): void {
  server.registerTool(
    "list_folders",
    {
      description:
        "Elenca le cartelle nella vault o in una sottocartella specifica.",
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
          .default(false)
          .describe("Includi sottocartelle annidate (default: false)"),
      },
    },
    async ({ folder, recursive }) => {
      const base = folder ? resolvePath(folder, false) : VAULT_PATH;
      const pattern = recursive ? "**/" : "*/";
      const dirs = await fg(pattern, {
        cwd: base,
        onlyDirectories: true,
        dot: false,
      });
      const folders = dirs.sort().map((d) => {
        const cleaned = d.endsWith("/") ? d.slice(0, -1) : d;
        return folder ? path.join(folder, cleaned) : cleaned;
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ count: folders.length, folders }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "create_folder",
    {
      description:
        "Crea una nuova cartella nella vault. Errore se la cartella esiste già.",
      inputSchema: {
        path: z.string().describe("Path della cartella relativo alla vault"),
      },
    },
    async ({ path: folderPath }) => {
      const absPath = resolvePath(folderPath, false);
      try {
        await fs.access(absPath);
        throw new Error(`La cartella esiste già: ${folderPath}`);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.startsWith("La cartella esiste già")
        ) {
          throw err;
        }
      }
      await fs.mkdir(absPath, { recursive: true });
      return {
        content: [
          {
            type: "text" as const,
            text: `Cartella creata: ${relativePath(absPath)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "delete_folder",
    {
      description:
        "Elimina una cartella dalla vault. Senza force, fallisce se la cartella non è vuota.",
      inputSchema: {
        path: z.string().describe("Path della cartella relativo alla vault"),
        force: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Elimina anche se non vuota, ricorsivamente (default: false)",
          ),
      },
    },
    async ({ path: folderPath, force }) => {
      const absPath = resolvePath(folderPath, false);

      if (absPath === VAULT_PATH) {
        throw new Error("Impossibile eliminare la vault root");
      }

      try {
        await fs.access(absPath);
      } catch {
        throw new Error(`Cartella non trovata: ${folderPath}`);
      }

      if (!force) {
        const entries = await fs.readdir(absPath);
        if (entries.length > 0) {
          throw new Error(
            `La cartella non è vuota. Usa force: true per eliminare ricorsivamente.`,
          );
        }
        await fs.rmdir(absPath);
      } else {
        await fs.rm(absPath, { recursive: true, force: true });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Cartella eliminata: ${folderPath}`,
          },
        ],
      };
    },
  );
}
