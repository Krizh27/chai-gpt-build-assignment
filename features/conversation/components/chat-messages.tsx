"use client";

import React from "react";
import { isTextUIPart, type UIMessage } from "ai";
import type { ChatStatus } from "ai";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { GitFork } from "lucide-react";
import { useCreateBranch } from "../hooks/use-conversation";
import { WebSearchCard } from "./web-search-card";

/** Extracts plain text from a `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

type ChatMessagesProps = {
  messages: UIMessage[];
  status: ChatStatus;
  activeBranchId: string;
  conversationId: string;
};

/**
 * Individual message item.
 */
const MessageItem = React.memo(function MessageItem({ 
    message, 
    conversationId, 
    activeBranchId, 
    isCreatingBranch, 
    onCreateBranch 
}: { 
    message: UIMessage;
    conversationId: string;
    activeBranchId: string;
    isCreatingBranch: boolean;
    onCreateBranch: (params: {
        conversationId: string;
        name: string;
        activeBranchId: string;
        upToMessageId: string;
    }) => void;
}) {
    const text = getMessageText(message);
    
    return (
        <Message from={message.role}>
            <MessageContent>
              {((message as { toolInvocations?: Array<{ toolCallId: string, state: "call" | "result", args: { query: string }, result?: any }> }).toolInvocations || []).map((tool) => (
                  <WebSearchCard key={tool.toolCallId} tool={tool} />
              ))}

              {text.length > 0 && <MessageResponse>{text}</MessageResponse>}
              
              {/* Added opacity transition to only show on hover of the message group */}
              <div className="mt-2 flex items-center justify-end opacity-0 transition-opacity duration-200 group-hover/message:opacity-100 focus-within:opacity-100">
                <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                        onCreateBranch({
                            conversationId,
                            name: `Forked from ${message.role}`,
                            activeBranchId,
                            upToMessageId: message.id
                        });
                    }}
                    disabled={isCreatingBranch}
                >
                    <GitFork className="h-3 w-3" />
                    Branch from here
                </Button>
              </div>
            </MessageContent>
        </Message>
    );
});

/**
 * Renders the conversation message list with markdown responses and a loading indicator.
 */
export function ChatMessages({ messages, status, activeBranchId, conversationId }: ChatMessagesProps) {
  const isWaiting =
    status === "submitted" && messages.at(-1)?.role === "user";

  const { mutate: createBranch, isPending: isCreatingBranch } = useCreateBranch();

  // Stable callback for branching
  const handleCreateBranch = React.useCallback((params: {
      conversationId: string;
      name: string;
      activeBranchId: string;
      upToMessageId: string;
  }) => {
      createBranch(params);
  }, [createBranch]);

  return (
    <Conversation>
      <ConversationContent className="mx-auto w-full max-w-3xl py-8">
        {messages.map((message) => (
          <MessageItem 
              key={message.id} 
              message={message} 
              conversationId={conversationId} 
              activeBranchId={activeBranchId} 
              isCreatingBranch={isCreatingBranch} 
              onCreateBranch={handleCreateBranch} 
          />
        ))}

        {isWaiting ? (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>
   
    </Conversation>
  );
}
