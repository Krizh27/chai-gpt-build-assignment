"use client";
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useChat } from "@ai-sdk/react"
import React, { useMemo, useTransition } from 'react'
import { useConversations } from '../hooks/use-conversation';
import { queryKeys } from '../utils/query-keys';
import { toast } from 'sonner';
import { ChatEmpty } from './chat-empty';
import { ChatMessages } from './chat-messages';
import { ChatComposer } from './chat-composer';
import type { Branch } from '@/lib/generated/prisma/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusIcon, TrashIcon, EditIcon, ChevronDown, Check, Loader2, MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from "next-themes";
import { BranchIcon } from '@/components/ui/branch-icon';
import { useCreateBranch, useRenameBranch, useDeleteBranch } from '../hooks/use-conversation';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

type ConversationViewProps = {
    conversationId: string;
    branches: Branch[];
    activeBranchId: string;
    initialMessages: UIMessage[];
};

/**
 * Main chat view — header, message list (or empty state), and composer with streaming.
 */
export const ConversationView = ({ conversationId, branches, activeBranchId, initialMessages }: ConversationViewProps) => {

    const queryClient = useQueryClient();
    const { data: conversations } = useConversations();
    const router = useRouter();
    const [isSwitchingBranch, startTransition] = useTransition();
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);
    
    const { mutate: createBranch, isPending: isCreatingBranch } = useCreateBranch();
    const { mutate: renameBranch, isPending: isRenamingBranch } = useRenameBranch();
    const { mutate: deleteBranch, isPending: isDeletingBranch } = useDeleteBranch();

    const transport = useMemo(() => new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages }) => ({
            body: {
                id: activeBranchId, // we pass the branchId instead of conversationId
                message: messages.at(-1)
            }
        })
    }), [activeBranchId]);

    const [input, setInput] = React.useState("");

    const { messages, sendMessage, status } = useChat({
        id: activeBranchId,
        messages: initialMessages,
        transport,
        onFinish: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    })
    
    console.log("CONVERSATION VIEW RENDER: status=", status, "input=", input, "isSending=", status !== "ready" || isSwitchingBranch);
    
    const title = conversations?.find((item) => item.id === conversationId)?.title ?? "Chat";
    const activeBranch = branches.find(b => b.id === activeBranchId);

    const getBranchDisplayName = (b: Branch, index: number) => {
        if (index === 0 && b.name === "Branch 1") return "Main";
        return b.name;
    };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mx-1 h-4" />
                <h1 className="truncate text-sm font-medium">{title}</h1>
                
                <div className="ml-auto flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                        title="Toggle theme"
                    >
                        {mounted && resolvedTheme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                    </Button>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger render={
                            <Button 
                                variant="outline" 
                                className="h-8 gap-2 rounded-md px-3 font-medium transition-colors hover:bg-muted"
                                disabled={isSwitchingBranch}
                            />
                        }>
                                {isSwitchingBranch ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : activeBranch ? (
                                    <div className="flex items-center gap-1.5">
                                        <BranchIcon className="size-4 text-muted-foreground" />
                                        <span>{getBranchDisplayName(activeBranch, branches.findIndex(b => b.id === activeBranchId))}</span>
                                    </div>
                                ) : (
                                    "Select Branch"
                                )}
                                <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[240px]">
                            <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Branches</DropdownMenuLabel>
                                {branches.map((b, i) => (
                                    <DropdownMenuItem 
                                        key={b.id} 
                                        onClick={() => {
                                            startTransition(() => {
                                                router.push(`/c/${conversationId}?branch=${b.id}`);
                                            });
                                        }}
                                        className="flex cursor-pointer items-center justify-between transition-colors"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <BranchIcon className="size-4 text-muted-foreground" />
                                            <span className="truncate">{getBranchDisplayName(b, i)}</span>
                                        </div>
                                        {b.id === activeBranchId && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem 
                                    onClick={() => {
                                        createBranch({ 
                                            conversationId, 
                                            name: `Branch ${branches.length + 1}`,
                                            activeBranchId
                                        });
                                    }}
                                    disabled={isCreatingBranch}
                                    className="cursor-pointer transition-colors"
                                >
                                    <PlusIcon className="mr-2 h-4 w-4" />
                                    Create Branch
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => {
                                        const newName = window.prompt("Enter new branch name:", activeBranch?.name);
                                        if (newName && newName.trim() !== "") {
                                            renameBranch({ branchId: activeBranchId, name: newName });
                                        }
                                    }}
                                    disabled={isRenamingBranch}
                                    className="cursor-pointer transition-colors"
                                >
                                    <EditIcon className="mr-2 h-4 w-4" />
                                    Rename Branch
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to delete this branch?")) {
                                            deleteBranch(activeBranchId);
                                        }
                                    }}
                                    disabled={isDeletingBranch || branches.length <= 1}
                                    className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
                                >
                                    <TrashIcon className="mr-2 h-4 w-4" />
                                    Delete Branch
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Added opacity change while switching to indicate loading state for the main chat area */}
            <div className={`flex flex-1 flex-col min-h-0 overflow-hidden transition-opacity duration-300 ${isSwitchingBranch ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {messages.length === 0 ? (
                    <ChatEmpty onPromptSelect={(prompt) => setInput(prompt)} />
                ) : (
                    <ChatMessages messages={messages} status={status} activeBranchId={activeBranchId} conversationId={conversationId} />
                )}
            </div>

            <ChatComposer
                onSend={(text) => {
                    void sendMessage({ text });
                }}
                isSending={status === "submitted" || status === "streaming" || isSwitchingBranch}
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                setInputValue={setInput}
            />
        </div>
    )
}
