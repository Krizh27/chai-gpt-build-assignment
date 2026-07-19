"use client";

import React, { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown, Globe, Loader2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

type WebSearchCardProps = {
    tool: {
        toolCallId: string;
        state: "call" | "result";
        args: { query: string };
        result?: {
            answer?: string;
            results: Array<{ title: string; url: string; content: string }>;
        };
    };
};

/** 
 * Extracts the domain from a URL to create a clean source badge (e.g., 'cnn.com' -> 'CNN')
 */
function extractDomain(url: string) {
    try {
        const hostname = new URL(url).hostname;
        const parts = hostname.replace('www.', '').split('.');
        // Attempt to get the main domain name and uppercase it for the badge
        if (parts.length >= 2) {
            return parts[parts.length - 2].toUpperCase();
        }
        return hostname;
    } catch {
        return "SOURCE";
    }
}

export function WebSearchCard({ tool }: WebSearchCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const isComplete = tool.state === "result";

    // Auto-close when it finishes, but let the user toggle it if they want
    React.useEffect(() => {
        if (isComplete) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsOpen(false);
        } else {
            setIsOpen(true);
        }
    }, [isComplete]);

    return (
        <div className="flex flex-col gap-1 mb-4 last:mb-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full max-w-md">
                <CollapsibleTrigger
                        className={cn(
                            "flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl border shadow-sm transition-all duration-200",
                            isOpen ? "bg-muted/50 border-border" : "bg-card hover:bg-muted/30 border-border/50",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        )}
                        disabled={!isComplete} // Don't let them toggle while it's still searching
                    >
                        {isComplete ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm font-medium text-foreground/80 truncate flex-1">
                            {isComplete ? (
                                <>Searching the web for <span className="font-semibold">&quot;{tool.args.query}&quot;</span></>
                            ) : (
                                <>Searching the web...</>
                            )}
                        </span>
                        {isComplete && (
                            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
                        )}
                </CollapsibleTrigger>
                
                {isComplete && tool.result?.results && tool.result.results.length > 0 && (
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down transition-all">
                        <div className="pt-3 pb-1 px-1">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                                <Globe className="w-3.5 h-3.5" />
                                {tool.result.results.length} Sources
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {tool.result.results.map((result, idx) => {
                                    const sourceName = extractDomain(result.url);
                                    return (
                                        <a
                                            key={idx}
                                            href={result.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-col gap-1 p-2.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors text-left max-w-full sm:max-w-[200px] flex-1 min-w-[140px] group"
                                            title={result.title}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors bg-muted px-1.5 py-0.5 rounded-sm">
                                                    {sourceName}
                                                </span>
                                                <Link2 className="w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
                                            </div>
                                            <span className="text-xs font-medium line-clamp-2 leading-snug">
                                                {result.title}
                                            </span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </CollapsibleContent>
                )}
            </Collapsible>
        </div>
    );
}
