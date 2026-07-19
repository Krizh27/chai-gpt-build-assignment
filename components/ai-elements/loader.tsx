import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Props for the {@link Loader} spinner component. */
export type LoaderProps = HTMLAttributes<HTMLDivElement> & {
  size?: number;
};

/** Pulsing loading indicator for in-progress assistant responses. */
export const Loader = ({ className, ...props }: LoaderProps) => (
  <div
    className={cn("flex items-center gap-1 h-6 px-1", className)}
    {...props}
  >
    <div className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce [animation-delay:-0.3s]" />
    <div className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce [animation-delay:-0.15s]" />
    <div className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce" />
  </div>
);
