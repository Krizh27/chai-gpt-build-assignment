"use client";

import { queryKeys } from "@/features/conversation/utils/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createMessage, deleteMessage, listMessages, updateMessage } from "../actions/messages-action";



/** Load messages for one branch. */
export function useMessages(branchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages.byBranch(branchId ?? "none"),
    queryFn: () => listMessages(branchId!),
    enabled: Boolean(branchId),
  });
}

/**
 * Send a user message.
 * After success we refresh messages + the sidebar (title / lastMessageAt).
 */
export function useCreateMessage(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => createMessage(branchId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.byBranch(branchId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not send message");
    },
  });
}

/** Edit an existing message. */
export function useUpdateMessage(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateMessage(id, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.byBranch(branchId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not update message");
    },
  });
}

/** Delete a message from the thread. */
export function useDeleteMessage(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.byBranch(branchId),
      });
      toast.success("Message deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not delete message");
    },
  });
}
