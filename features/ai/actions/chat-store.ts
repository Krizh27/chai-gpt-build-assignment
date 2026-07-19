"use server";

import { isTextUIPart, type UIMessage } from "ai";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Extracts plain text from an AI SDK `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
  if (!message.parts) return (message as { content?: string }).content || "";
  return message.parts.filter(isTextUIPart).map((part) => part.text).join("");
}

/**
 * Normalizes stored message parts from the database into AI SDK `UIMessage` parts.
 * Falls back to a single text part when no structured parts are stored.
 */
function toUIMessageParts(
  parts: Prisma.JsonValue | null,
  content: string
): UIMessage["parts"] {
  const stored = parts as UIMessage["parts"] | null;
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  return [{ type: "text", text: content }];
}

/**
 * Loads all messages for a branch from the database as AI SDK `UIMessage`s.
 *
 * @param branchId - The branch whose messages to load.
 * @returns Messages ordered oldest to newest, ready for `useChat`.
 */
export async function loadChatMessages(
  branchId: string
): Promise<UIMessage[]> {
  const rows = await prisma.message.findMany({
    where: { branchId },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    role: row.role === "ASSISTANT" ? "assistant" : "user",
    content: row.content,
    parts: toUIMessageParts(row.parts, row.content),
    toolInvocations: row.metadata as Array<{ toolCallId: string, state: "call" | "result", args: any, result?: any }> | undefined,
  }) as UIMessage);
}

type SaveChatMessagesOptions = {
  updateTitle?: boolean;
};

/**
 * Upserts AI SDK `UIMessage`s into the database for a branch.
 *
 * @param branchId - Target branch ID.
 * @param messages - Messages to persist (system messages are skipped).
 * @param options.updateTitle - When true, auto-titles "New Chat" from the first user message.
 */
export async function saveChatMessages(
  branchId: string,
  messages: UIMessage[],
  options: SaveChatMessagesOptions = {}
) {
  const { updateTitle = true } = options;

  for (const message of messages) {
    if (message.role === "system") continue;

    const content = getMessageText(message);
    const role = message.role === "assistant" ? "ASSISTANT" : "USER";

    await prisma.message.upsert({
      where: { id: message.id },
      create: {
        id: message.id,
        branchId,
        role,
        status: "COMPLETE",
        content,
        parts: message.parts as Prisma.InputJsonValue,
        metadata: ((message as { toolInvocations?: unknown[] }).toolInvocations || []) as Prisma.InputJsonValue,
      },
      update: {
        content,
        parts: message.parts as Prisma.InputJsonValue,
        metadata: ((message as { toolInvocations?: unknown[] }).toolInvocations || []) as Prisma.InputJsonValue,
        status: "COMPLETE",
      },
    });
  }

  const branch = await prisma.branch.findUniqueOrThrow({
    where: { id: branchId },
    include: { conversation: { select: { title: true } } },
  });

  const firstUser = messages.find((message) => message.role === "user");
  const firstUserText = firstUser ? getMessageText(firstUser).trim() : "";

  await prisma.conversation.update({
    where: { id: branch.conversationId },
    data: {
      lastMessageAt: new Date(),
      title:
        updateTitle && branch.conversation.title === "New Chat" && firstUserText
          ? firstUserText.slice(0, 48)
          : branch.conversation.title,
    },
  });
}
