"use client";

import FullScreenButton from "@/components/fullscreen-button";
import React, { useRef } from "react";
import { Navigation } from "@/components/navigation";
import SettingsButton from "@/components/settings-button";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function Layout({ children }: React.PropsWithChildren) {
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: 1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Header */}
      <div ref={sentinelRef} className="h-0" />
      <Navigation
        className={cn(
          "fixed w-full left-0 top-0 z-50 transition-colors",
          isStuck && "border-b bg-background/80 backdrop-blur-sm",
        )}
        leftItems={
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        rightItems={
          <>
            <SettingsButton />
            <FullScreenButton />
          </>
        }
      />
      {children}
    </>
  );
}
