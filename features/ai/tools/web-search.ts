import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

const client = tavily({
  apiKey: process.env.TAVILY_API_KEY!,
});

export const webSearchTool = tool({
  description:
    "Search the web for recent or real-time information when needed.",

  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),

  execute: async ({ query }) => {
    console.log("🔍 Searching:", query);

    const response = await client.search(query, {
      searchDepth: "basic",
      maxResults: 3,
      includeAnswer: true,
      includeRawContent: false,
    });

    return {
      answer: response.answer,
      results: response.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
      })),
    };
  },
});