"use client";

import FullScreenButton from "@/components/fullscreen-button";
import { MaximizeIcon } from "lucide-react";
import React from "react";

export default function Layout({ children }: React.PropsWithChildren) {
  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 flex h-16 flex-shrink-0 items-center justify-center px-8">
        <div className="absolute right-8 flex items-center gap-3">
          <FullScreenButton />
        </div>
      </header>
      <main className="flex min-h-screen pt-20">{children}</main>
    </>
  );
}
