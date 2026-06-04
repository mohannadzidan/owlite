"use client";
import { cn } from "@/lib/utils";
import React, { ComponentProps } from "react";

export function Navigation({
  children,
  className,
  rightItems,
  ...props
}: ComponentProps<"nav"> & { rightItems?: React.ReactNode }) {
  return (
    <nav className={cn("flex items-center gap-4 px-8 h-16", className)} {...props}>
      <div className="flex-1">{children}</div>
      {rightItems}
    </nav>
  );
}
