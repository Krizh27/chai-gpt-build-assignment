import { loadChatMessages } from '@/features/ai/actions/chat-store';
import { getBranches, getConversation } from '@/features/conversation/actions/conversation-actions';
import { ConversationView } from '@/features/conversation/components/conversation-view';
import { notFound } from 'next/navigation';
import React from 'react'

type ConversationPageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ branch?: string }>;
};

/**
 * Conversation page — loads messages and renders the chat UI for a given ID.
 */
const page = async({params, searchParams}:ConversationPageProps) => {
    const {id} = await params;
    const {branch: branchId} = await searchParams;

    try {
      await getConversation(id)
    } catch {
      notFound()
    }

    const branches = await getBranches(id);
    const mainBranch = branches.find((b) => b.isMain) || branches[0];
    
    if (!mainBranch) {
        notFound();
    }

    const activeBranch = branchId ? (branches.find((b) => b.id === branchId) || mainBranch) : mainBranch;

    const initialMessages = await loadChatMessages(activeBranch.id);

  return (
    <ConversationView
      key={activeBranch.id}
      conversationId={id}
      branches={branches}
      activeBranchId={activeBranch.id}
      initialMessages={initialMessages}
    />
  )
}

export default page