"use client";
import { cn } from "@/lib/utils";
import React, { ComponentProps } from "react";
import { useNavigationBarStore } from "@/lib/navigation-bar-store";

export function Navigation({
  children,
  className,
  rightItems,
  ...props
}: ComponentProps<"nav"> & { rightItems?: React.ReactNode }) {
  const items = useNavigationBarStore((s) => s.items);

  return (
    <nav className={cn("flex items-center gap-4 px-8 h-16", className)} {...props}>
      <div className="flex-1">{children}</div>
      {Array.from(items.values())}
      {rightItems}
    </nav>
  );
}
