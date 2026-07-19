import { Globe, GitFork, Zap, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";

/** Empty-state placeholder shown before the first message is sent. */
export function ChatEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="mb-4 flex size-14 items-center justify-center">
        <Logo className="size-12 text-primary drop-shadow-sm" />
      </div>
      <h2 className="mb-8 text-3xl font-semibold tracking-tight text-foreground/90">
        How can I help you today?
      </h2>
      
      <div className="flex w-full max-w-2xl items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
          <Globe className="h-4 w-4 text-blue-500" />
          Web Search
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
          <GitFork className="h-4 w-4 text-emerald-500" />
          Chat Branching
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
          <Zap className="h-4 w-4 text-amber-500" />
          Streaming Responses
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Persistent Memory
        </div>
      </div>
    </div>
  );
}
