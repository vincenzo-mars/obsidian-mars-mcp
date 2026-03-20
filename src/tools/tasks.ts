import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fg from "fast-glob";
import * as fs from "fs/promises";
import matter from "gray-matter";
import * as path from "path";
import { z } from "zod";
import { resolvePath, VAULT_PATH } from "../vault-utils.js";

interface TaskItem {
  note_path: string;
  line_number: number;
  task_text: string;
  completed: boolean;
}

const TASK_REGEX = /^[\s]*[-*+]\s+\[([ xX])\]\s+(.+)/;

function parseTasks(content: string, notePath: string): TaskItem[] {
  const lines = content.split("\n");
  const tasks: TaskItem[] = [];
  lines.forEach((line, idx) => {
    const match = TASK_REGEX.exec(line);
    if (match) {
      tasks.push({
        note_path: notePath,
        line_number: idx + 1,
        task_text: match[2].trim(),
        completed: match[1].toLowerCase() === "x",
      });
    }
  });
  return tasks;
}

export function registerTaskTools(server: McpServer): void {
  server.registerTool(
    "find_tasks",
    {
      description:
        "Cerca task ([ ] incomplete e [x] completate) in tutta la vault o in una cartella. " +
        "Ignora i task nel frontmatter YAML.",
      inputSchema: {
        status: z
          .enum(["all", "incomplete", "complete"])
          .describe(
            "Filtra per stato: 'all' tutte, 'incomplete' non completate, 'complete' completate",
          ),
        folder: z
          .string()
          .optional()
          .describe("Limita la ricerca a una sottocartella della vault"),
        recursive: z
          .boolean()
          .optional()
          .default(true)
          .describe("Includi sottocartelle (default: true)"),
      },
    },
    async ({ status, folder, recursive }) => {
      const base = folder ? resolvePath(folder, false) : VAULT_PATH;
      const pattern = recursive ? "**/*.md" : "*.md";
      const files = await fg(pattern, {
        cwd: base,
        onlyFiles: true,
        dot: false,
      });

      const allTasks: TaskItem[] = [];
      for (const file of files) {
        const absPath = path.join(base, file);
        const raw = await fs.readFile(absPath, "utf-8");
        const { content } = matter(raw);
        const relPath = folder ? path.join(folder, file) : file;
        allTasks.push(...parseTasks(content, relPath));
      }

      const filtered =
        status === "all"
          ? allTasks
          : allTasks.filter((t) =>
              status === "complete" ? t.completed : !t.completed,
            );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { count: filtered.length, tasks: filtered },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_note_tasks",
    {
      description:
        "Restituisce tutti i task ([ ] e [x]) presenti in una nota specifica.",
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
      const tasks = parseTasks(content, notePath);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: tasks.length,
                note_path: notePath,
                tasks: tasks.map(({ line_number, task_text, completed }) => ({
                  line_number,
                  task_text,
                  completed,
                })),
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
