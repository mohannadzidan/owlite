import { cn } from "@/lib/utils";
import { type ComponentProps } from "react";

export default function Heading({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "mb-2 text-xs font-semibold uppercase tracking-widest text-white/40",
        className,
      )}
      {...props}
    />
  );
}
