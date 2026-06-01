"use client";

import FullScreenButton from "@/components/fullscreen-button";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function Layout({ children }: React.PropsWithChildren) {
  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 flex h-16 flex-shrink-0 items-center justify-center px-8">
        <div className="absolute right-8 flex items-center gap-3">
          <Link
            href="/settings"
            aria-label="Settings"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Link>
          <FullScreenButton />
        </div>
      </header>
      <main className="flex min-h-screen pt-20">{children}</main>
    </>
  );
}
