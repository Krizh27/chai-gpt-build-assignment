"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import type { MessageRole } from "@/lib/generated/prisma/client";

/** Shape of a message record returned from the database. */
export type MessageItem = {
    id: string;
    branchId: string;
    role: MessageRole;
    status: "PENDING" | "COMPLETE" | "ERROR";
    content: string;
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Verifies that a branch exists and belongs to the given user via conversation.
 *
 * @throws {Error} When the branch is not found.
 */
async function assertOwnsBranch(branchId: string, userId: string) {
    const branch = await prisma.branch.findFirst({
        where: { id: branchId, conversation: { userId } },
        include: { conversation: true },
    });

    if (!branch) {
        throw new Error("Branch not found");
    }

    return branch;
}

/** Load messages for a branch (oldest → newest). */
export async function listMessages(
    branchId: string
  ): Promise<MessageItem[]> {
    const user = await requireUser();
    await assertOwnsBranch(branchId, user.id);
  
    return prisma.message.findMany({
      where: { branchId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        branchId: true,
        role: true,
        status: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
  
  /**
   * Create a user message in a branch.
   * No AI reply yet — this only persists the user's text.
   * Optionally renames "New Chat" using the first message.
   */
  export async function createMessage(branchId: string, content: string) {
    const user = await requireUser();
    const branch = await assertOwnsBranch(branchId, user.id);
  
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error("Message cannot be empty");
    }
  
    const message = await prisma.message.create({
      data: {
        branchId,
        role: "USER",
        status: "COMPLETE",
        content: trimmed,
      },
    });
  
    const shouldRename =
      branch.conversation.title === "New Chat" || branch.conversation.title.trim() === "";
  
    await prisma.conversation.update({
      where: { id: branch.conversationId },
      data: {
        lastMessageAt: new Date(),
        ...(shouldRename
          ? {
              title:
                trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed,
            }
          : {}),
      },
    });
  
    revalidatePath("/");
    revalidatePath(`/c/${branch.conversationId}`);
    return message;
  }
  
  /** Update message text (e.g. edit). */
  export async function updateMessage(messageId: string, content: string) {
    const user = await requireUser();
    const trimmed = content.trim();
  
    if (!trimmed) {
      throw new Error("Message cannot be empty");
    }
  
    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      include: { branch: { include: { conversation: true } } },
    });
  
    if (!existing || existing.branch.conversation.userId !== user.id) {
      throw new Error("Message not found");
    }
  
    const message = await prisma.message.update({
      where: { id: messageId },
      data: { content: trimmed },
    });
  
    revalidatePath(`/c/${existing.branch.conversationId}`);
    return message;
  }
  
  /** Delete a single message. */
  export async function deleteMessage(messageId: string) {
    const user = await requireUser();
  
    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      include: { branch: { include: { conversation: true } } },
    });
  
    if (!existing || existing.branch.conversation.userId !== user.id) {
      throw new Error("Message not found");
    }
  
    await prisma.message.delete({ where: { id: messageId } });
  
    revalidatePath(`/c/${existing.branch.conversationId}`);
    return { id: messageId, branchId: existing.branchId };
  }
  