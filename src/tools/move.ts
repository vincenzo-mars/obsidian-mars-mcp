import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fg from "fast-glob";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import {
  ensureParentDir,
  relativePath,
  resolvePath,
  VAULT_PATH,
} from "../vault.js";

export function registerMoveTools(server: McpServer): void {
  server.registerTool(
    "move_note",
    {
      description:
        "Sposta o rinomina una nota Obsidian. " +
        "Aggiorna automaticamente tutti i [[wikilink]] che puntano alla nota rinominata. " +
        "Stesso folder = rinomina; folder diverso = sposta.",
      inputSchema: {
        source_path: z
          .string()
          .describe("Path attuale della nota relativo alla vault"),
        destination_path: z
          .string()
          .describe("Nuovo path della nota relativo alla vault"),
      },
    },
    async ({ source_path, destination_path }) => {
      const absSource = resolvePath(source_path);
      const absDest = resolvePath(destination_path);

      if (absSource === absDest) {
        throw new Error("Source e destination sono lo stesso file");
      }

      try {
        await fs.access(absSource);
      } catch {
        throw new Error(`Nota non trovata: ${source_path}`);
      }

      try {
        await fs.access(absDest);
        throw new Error(`La destinazione esiste già: ${destination_path}`);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.startsWith("La destinazione esiste già")
        ) {
          throw err;
        }
      }

      await ensureParentDir(absDest);

      try {
        await fs.rename(absSource, absDest);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err as NodeJS.ErrnoException).code === "EXDEV"
        ) {
          await fs.copyFile(absSource, absDest);
          await fs.unlink(absSource);
        } else {
          throw err;
        }
      }

      const oldBasename = path.basename(absSource, ".md");
      const newBasename = path.basename(absDest, ".md");

      if (oldBasename === newBasename) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  moved_from: relativePath(absSource),
                  moved_to: relativePath(absDest),
                  links_updated: 0,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const escaped = oldBasename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wikilinkRegex = new RegExp(
        `\\[\\[${escaped}((?:[|#][^\\]]*)?)\\]\\]`,
        "g",
      );

      const allFiles = await fg("**/*.md", {
        cwd: VAULT_PATH,
        onlyFiles: true,
        dot: false,
      });

      let linksUpdated = 0;
      for (const file of allFiles) {
        const absPath = path.join(VAULT_PATH, file);
        const content = await fs.readFile(absPath, "utf-8");
        const updated = content.replace(wikilinkRegex, `[[${newBasename}$1]]`);
        if (updated !== content) {
          await fs.writeFile(absPath, updated, "utf-8");
          linksUpdated++;
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                moved_from: relativePath(absSource),
                moved_to: relativePath(absDest),
                links_updated: linksUpdated,
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
