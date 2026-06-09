import { cn } from "@/lib/utils";
import { type ComponentProps } from "react";

export default function Muted({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm leading-relaxed text-white/75", className)} {...props} />;
}
