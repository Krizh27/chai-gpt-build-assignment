"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
    createBranch,
    createConversation,
    deleteBranch,
    deleteConversation,
    listConversations,
    renameBranch,
    updateConversation,
} from "@/features/conversation/actions/conversation-actions";
import { queryKeys } from "../utils/query-keys";

/**
 * Fetches all conversations for the sidebar via React Query.
 */
export function useConversations() {
    return useQuery({
        queryKey: queryKeys.conversations.all,
        queryFn: () => listConversations(),
    });
}

/**
 * Mutation hook to create a new conversation and navigate to it.
 */
export function useCreateConversation() {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: (title?: string) => createConversation(title),
        onSuccess: (conversation) => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });
            router.push(`/c/${conversation.id}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || "Could not create chat");
        },
    });
}

/** Rename / pin / archive a conversation. */
export function useUpdateConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            ...data
        }: {
            id: string;
            title?: string;
            isPinned?: boolean;
            isArchived?: boolean;
        }) => updateConversation(id, data),
        onSuccess: (conversation) => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.detail(conversation.id),
            });
        },
        onError: (error: Error) => {
            toast.error(error.message || "Could not update chat");
        },
    });
}

/** Delete a conversation and leave the page if you were viewing it. */
export function useDeleteConversation(activeId?: string) {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: (id: string) => deleteConversation(id),
        onSuccess: ({ id }) => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });

            if (activeId === id) {
                router.push("/");
            }

            toast.success("Chat deleted");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Could not delete chat");
        },
    });
}

/**
 * Mutation hook to create a new branch.
 */
export function useCreateBranch() {
    const router = useRouter();

    return useMutation({
        mutationFn: ({ conversationId, name, activeBranchId, upToMessageId }: { conversationId: string; name: string; activeBranchId?: string; upToMessageId?: string }) => 
            createBranch(conversationId, name, activeBranchId, upToMessageId),
        onSuccess: (branch) => {
            toast.success("Branch created");
            router.push(`/c/${branch.conversationId}?branch=${branch.id}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || "Could not create branch");
        },
    });
}

/**
 * Mutation hook to rename a branch.
 */
export function useRenameBranch() {
    return useMutation({
        mutationFn: ({ branchId, name }: { branchId: string; name: string }) => 
            renameBranch(branchId, name),
        onSuccess: () => {
            toast.success("Branch renamed");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Could not rename branch");
        },
    });
}

/**
 * Mutation hook to delete a branch.
 */
export function useDeleteBranch() {
    const router = useRouter();

    return useMutation({
        mutationFn: (branchId: string) => deleteBranch(branchId),
        onSuccess: ({ conversationId }) => {
            toast.success("Branch deleted");
            // Next.js will automatically redirect to the Main branch because we omitted the ?branch= parameter
            router.push(`/c/${conversationId}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || "Could not delete branch");
        },
    });
}