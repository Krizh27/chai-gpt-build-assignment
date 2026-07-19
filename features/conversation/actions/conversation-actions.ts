"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/** Shape of a conversation row returned in the sidebar list. */
export type ConversationListItem = {
    id: string;
    title: string;
    isPinned: boolean;
    isArchived: boolean;
    lastMessageAt: Date;
    createdAt: Date;
    updatedAt: Date;
};


/**
 * Verifies that a conversation exists and belongs to the given user.
 *
 * @throws {Error} When the conversation is not found or not owned by the user.
 */
async function assertOwnsConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            userId
        }
    });

    if (!conversation) {
        throw new Error("Conversation not found")
    }

    return conversation
}

/**
 * Fetches a single conversation owned by the current user.
 *
 * @param conversationId - The conversation to load.
 * @throws {Error} When the conversation is not found.
 */
export async function getConversation(conversationId: string) {
    const user = await requireUser();
    return assertOwnsConversation(conversationId, user.id)
}


/**
 * Lists non-archived conversations for the current user.
 * Pinned conversations appear first, then sorted by most recent activity.
 */
export async function listConversations(): Promise<ConversationListItem[]> {
    const user = await requireUser();

    return prisma.conversation.findMany({
        where: { userId: user.id, isArchived: false },
        orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
        select: {
            id: true,
            title: true,
            isPinned: true,
            isArchived: true,
            lastMessageAt: true,
            createdAt: true,
            updatedAt: true,
        },
    })
}

/**
 * Creates a new conversation for the current user.
 *
 * @param title - Optional title; defaults to "New Chat".
 */
export async function createConversation(title = "New Chat") {
    const user = await requireUser();

    return prisma.conversation.create({
        data: {
            userId: user.id,
            title: title.trim() || "New Chat",
            branches: {
                create: {
                    name: "Main",
                    isMain: true,
                }
            }
        },
        include: {
            branches: true
        }
    });
}

/**
 * Updates conversation metadata (title, pin, or archive status).
 *
 * @param conversationId - The conversation to update.
 * @param data - Fields to change; omitted fields are left unchanged.
 */
export async function updateConversation(
    conversationId: string,
    data: { title?: string; isPinned?: boolean; isArchived?: boolean }
) {
    const user = await requireUser();
    await assertOwnsConversation(conversationId, user.id);

    const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
            ...(data.title !== undefined ? { title: data.title.trim() || "New Chat" } : {}),
            ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
            ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
        },
    });

    revalidatePath("/");
    revalidatePath(`/c/${conversationId}`);
    return conversation;
}



/**
 * Permanently deletes a conversation owned by the current user.
 *
 * @param conversationId - The conversation to delete.
 * @returns The deleted conversation ID.
 */
export async function deleteConversation(conversationId: string) {
    const user = await requireUser();
    await assertOwnsConversation(conversationId, user.id);

    await prisma.conversation.delete({
        where: { id: conversationId },
    });

    revalidatePath("/");
    return { id: conversationId };
}

/**
 * Fetches all branches for a given conversation.
 *
 * @param conversationId - The conversation ID.
 */
export async function getBranches(conversationId: string) {
    const user = await requireUser();
    await assertOwnsConversation(conversationId, user.id);

    let branches = await prisma.branch.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" }
    });

    // Auto-repair conversations that have no branches
    if (branches.length === 0) {
        const newBranch = await prisma.branch.create({
            data: {
                name: "Main",
                isMain: true,
                conversationId
            }
        });
        branches = [newBranch];
    }

    return branches;
}

/**
 * Creates a new branch for a given conversation, optionally copying messages.
 */
export async function createBranch(conversationId: string, name: string, activeBranchId?: string, upToMessageId?: string) {
    const user = await requireUser();
    await assertOwnsConversation(conversationId, user.id);

    const branch = await prisma.branch.create({
        data: {
            name: name.trim() || "New Branch",
            isMain: false,
            conversationId
        }
    });

    // If we are forking from a specific message, copy history up to that point
    if (activeBranchId) {
        let messagesToCopy: any[] = [];
        
        if (upToMessageId) {
            const upToMessage = await prisma.message.findUnique({ where: { id: upToMessageId } });
            if (upToMessage) {
                messagesToCopy = await prisma.message.findMany({
                    where: {
                        branchId: activeBranchId,
                        createdAt: { lte: upToMessage.createdAt }
                    },
                    orderBy: { createdAt: "asc" }
                });
            }
        } else {
            messagesToCopy = await prisma.message.findMany({
                where: { branchId: activeBranchId },
                orderBy: { createdAt: "asc" }
            });
        }
            
        if (messagesToCopy.length > 0) {
            // Copy messages to the new branch while preserving timestamps for correct ordering
            await prisma.message.createMany({
                data: messagesToCopy.map((m) => ({
                    branchId: branch.id,
                    role: m.role,
                    status: m.status,
                    content: m.content,
                    parts: m.parts ?? require("@prisma/client").Prisma.JsonNull,
                    metadata: m.metadata ?? require("@prisma/client").Prisma.JsonNull,
                    createdAt: m.createdAt,
                    updatedAt: m.updatedAt,
                }))
            });
        }
    }

    revalidatePath(`/c/${conversationId}`);
    return branch;
}

/**
 * Renames an existing branch.
 */
export async function renameBranch(branchId: string, newName: string) {
    const user = await requireUser();
    
    const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: { conversation: true }
    });
    
    if (!branch || branch.conversation.userId !== user.id) {
        throw new Error("Branch not found");
    }

    const updated = await prisma.branch.update({
        where: { id: branchId },
        data: { name: newName.trim() || branch.name }
    });
    
    revalidatePath(`/c/${branch.conversationId}`);
    return updated;
}

/**
 * Deletes a branch, ensuring it is not the last remaining branch.
 */
export async function deleteBranch(branchId: string) {
    const user = await requireUser();
    
    const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: { conversation: { include: { branches: true } } }
    });
    
    if (!branch || branch.conversation.userId !== user.id) {
        throw new Error("Branch not found");
    }

    if (branch.conversation.branches.length <= 1) {
        throw new Error("Cannot delete the only remaining branch");
    }

    await prisma.branch.delete({ where: { id: branchId } });
    
    revalidatePath(`/c/${branch.conversationId}`);
    return { id: branchId, conversationId: branch.conversationId };
}