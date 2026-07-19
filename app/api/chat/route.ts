import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
import { getChatModel } from "@/features/ai/utils/model";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { webSearchTool } from "@/features/ai/tools/web-search";
import { stepCountIs } from "ai";
import { convertToModelMessages, createIdGenerator, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage } from "ai";

/**
 * POST /api/chat — Streams an AI assistant reply for a conversation branch.
 *
 * Validates auth and ownership, persists the user message, then streams the
 * assistant response via the AI SDK. Final messages are saved when the stream ends.
 */
export async function POST(req: Request) {
    await auth.protect();

    const { message, id: branchId }: { message: UIMessage, id: string } = await req.json();

    if (!message || !branchId) {
        return new Response("Missing message or branch id", { status: 400 });
    }

    const user = await requireUser();

    const branch = await prisma.branch.findFirst({
        where: {
            id: branchId,
            conversation: { userId: user.id }
        },
        include: { conversation: true }
    });

    if (!branch) {
        return new Response("Branch not found", { status: 404 });
    }

    const previousMessages = await loadChatMessages(branchId);

    const alreadySaved = previousMessages.some(
        (storedMessage) => storedMessage.id === message.id
    );

    const messages = alreadySaved ? previousMessages : [...previousMessages, message];

    if (!alreadySaved) {
        await saveChatMessages(branchId, [message]);
    }

    const result = streamText({
        model: getChatModel(branch.conversation.model),
        system: `
You are ChaiGPT, an AI assistant with access to a web search tool.

Your primary goal is to provide accurate information.

For ANY question involving:

- today
- yesterday
- tomorrow
- latest
- recent
- current
- this week
- this month
- news
- sports
- elections
- weather
- prices
- stocks
- cryptocurrency
- public office holders
- ongoing events
- live information

ALWAYS use the webSearch tool before answering.

Never rely on your internal knowledge for time-sensitive information.

After receiving the search results:

- Base your answer ONLY on the retrieved information.
- If multiple sources disagree, mention that.
- If the search results are insufficient, explicitly say so instead of guessing.
- Include the most relevant source URLs whenever available.

For timeless topics (math, programming concepts, history, science, etc.) answer directly without using the tool.
`,
        messages: await convertToModelMessages(messages),
        tools: {
            webSearch: webSearchTool,
        },
        stopWhen: stepCountIs(3),
    });
    return createUIMessageStreamResponse({
        stream: toUIMessageStream({
            stream: result.fullStream,
            originalMessages: messages,
            generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
            onEnd: async ({ messages: finalMessages }) => {
                try {
                    await saveChatMessages(branchId, finalMessages, { updateTitle: false });
                } catch (error) {
                    console.error(error);
                }
            }
        })
    });
}