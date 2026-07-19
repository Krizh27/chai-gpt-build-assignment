"use client";

import * as React from "react";
import { ArrowUpIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ChatComposerProps = {
  onSend: (content: string) => Promise<void> | void;
  isSending?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  setInputValue?: (v: string) => void;
};

/**
 * Message input form with send button. Enter sends; Shift+Enter inserts a newline.
 */
export function ChatComposer({
  onSend,
  isSending = false,
  placeholder = "Message ChaiGPT…",
  className,
  autoFocus = false,
  value,
  onChange,
  setInputValue,
}: ChatComposerProps) {
  const [internalValue, setInternalValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  React.useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  /** Submits the current message when the form is submitted or Enter is pressed. */
  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const content = currentValue.trim();
    if (!content || isSending) return;

    if (isControlled && setInputValue) {
      setInputValue("");
    } else {
      setInternalValue("");
    }
    
    await onSend(content);
    textareaRef.current?.focus();
  }

  /** Handles keyboard shortcuts — Enter to send, Shift+Enter for a new line. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  const canSend = currentValue.trim().length > 0 && !isSending;

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className={cn("mx-auto w-full max-w-3xl px-4 pb-4 md:px-6", className)}
    >
      <InputGroup className="h-auto min-h-[60px] rounded-[1.5rem] border border-border/60 bg-background shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-none dark:bg-muted/30 transition-all duration-300 hover:border-border focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 focus-within:shadow-md">
        <InputGroupTextarea
          ref={textareaRef}
          value={currentValue}
          onChange={(event) => {
            if (isControlled && onChange) {
              onChange(event);
            } else {
              setInternalValue(event.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSending}
          rows={1}
          className="max-h-48 min-h-12 py-3.5 pl-4 text-[15px] leading-relaxed"
        />
        <InputGroupAddon align="inline-end" className="pr-2 pb-2 self-end">
          <InputGroupButton
            type="submit"
            size="icon-sm"
            variant="default"
            disabled={!canSend}
            className="size-9 rounded-full"
            aria-label="Send message"
          >
            {isSending ? <Spinner /> : <ArrowUpIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground/80 px-2">
        <p>ChaiGPT can make mistakes. Check important info.</p>
        <div className="hidden sm:flex items-center gap-1.5 font-medium opacity-80">
          <span>↵</span> Send <span className="mx-1">•</span> <span>⇧ ↵</span> New line
        </div>
      </div>
    </form>
  );
}
