import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fill, LEARNING_NOTE_PROMPT } from "./templates.js";

export function registerLearningPrompts(server: McpServer): void {
  server.registerPrompt(
    "learn",
    {
      title: "Learning Note",
      description:
        "Genera il prompt per creare una nota di formazione professionale nella vault Obsidian",
      argsSchema: {
        topic: z.string().describe("Il tema della nota di formazione"),
      },
    },
    async ({ topic }) => {
      const today = new Date().toISOString().split("T")[0];
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: fill(LEARNING_NOTE_PROMPT, { topic, today }),
            },
          },
        ],
      };
    },
  );
}
