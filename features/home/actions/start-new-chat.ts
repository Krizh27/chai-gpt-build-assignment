"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { createConversation } from "@/features/conversation/actions/conversation-actions";

/**
 * Server action that creates a new conversation titled "New Chat",
 * or reuses an existing empty one to avoid spamming the DB.
 *
 * @returns The ID of the conversation.
 */
export async function startNewChat(){
    const user = await requireUser();

    // Look for an existing "New Chat" with no messages but at least one branch
    const emptyConversation = await prisma.conversation.findFirst({
        where: {
            userId: user.id,
            title: "New Chat",
            branches: {
                some: {}, // MUST have at least one branch
                every: {
                    messages: {
                        none: {}
                    }
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    if (emptyConversation) {
        return emptyConversation.id;
    }

    // Otherwise, create a new one properly with a default branch
    const conversation = await createConversation();
    return conversation.id;
}