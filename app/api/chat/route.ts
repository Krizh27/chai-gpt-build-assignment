import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
import { getChatModel } from "@/features/ai/utils/model";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { webSearchTool } from "@/features/ai/tools/web-search";
import { stepCountIs } from "ai";
import { convertToModelMessages, createIdGenerator, createUIMessageStream, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage } from "ai";
/**
 * POST /api/chat — Streams an AI assistant reply for a conversation.
 *
 * Validates auth and ownership, persists the user message, then streams the
 * assistant response via the AI SDK. Final messages are saved when the stream ends.
 */
export async function POST(req: Request) {
    await auth.protect();

    const { message, id }: { message: UIMessage, id: string } = await req.json();

    if (!message || !id) {
        return new Response("Missing message or conversation id", { status: 400 });
    }

    const user = await requireUser();

    const conversation = await prisma.conversation.findFirst({
        where: {
            id,
            userId: user.id
        }
    });

    if (!conversation) {
        return new Response("Conversation not found", { status: 404 });
    }

    const previousMessages = await loadChatMessages(id);

    const alreadySaved = previousMessages.some(
        (storedMessage)=>storedMessage.id === message.id
    )

    const messages = alreadySaved ? previousMessages : [...previousMessages, message];

    if(!alreadySaved){
        await saveChatMessages(id, [message]);
    }

    // const result =  streamText({
    //     model: getChatModel(conversation.model),
    //     system: conversation.systemPrompt ?? "You are ChaiGpt , a helpful assistant",
    //     messages: await convertToModelMessages(messages),
    // });
// const result = streamText({
    
//     model: getChatModel(conversation.model),

//     system: `
// You are ChaiGPT.

// If the user asks about current events, recent news, recent software releases,
// sports, weather, live information or anything that may have changed recently,
// use the webSearch tool.

// Do not use the tool for timeless questions like math,
// algorithms or programming concepts.
// `,

//     messages: await convertToModelMessages(messages),

//     tools: {
//         webSearch: webSearchTool,
//     },
// });

const result = streamText({
  model: getChatModel(conversation.model),

  system: `
You are ChaiGPT.

You are a helpful assistant.

When you use webSearch, ALWAYS answer the user's question after receiving the tool result.
Never stop after calling the tool.

Do not use the tool for timeless questions.
`,

  messages: await convertToModelMessages(messages),

  tools: {
    webSearch: webSearchTool,
  },

  stopWhen: stepCountIs(2),
});
    result.consumeStream();
    console.log(result);
    return createUIMessageStreamResponse({
        stream:toUIMessageStream({
           stream:result.stream,
           originalMessages:messages,
           generateMessageId:createIdGenerator({prefix:"msg" , size:16}),
           onEnd:async({messages:finalMessages})=>{
            try {
                await saveChatMessages(id , finalMessages , {updateTitle:false})
            } catch (error) {
                console.error(error);
            }
           }
        })
    })

}