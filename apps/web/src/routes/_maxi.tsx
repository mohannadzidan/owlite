import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Navigation } from "@/components/navigation";
import FullScreenButton from "@/components/fullscreen-button";
import SettingsButton from "@/components/settings-button";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/_maxi")({
  component: MaxiLayout,
});

function MaxiLayout() {
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
      <div ref={sentinelRef} className="h-0" />
      <Navigation
        className={cn(
          "fixed w-full left-0 top-0 z-50 transition-colors",
          isStuck && "border-b bg-background/80 backdrop-blur-sm",
        )}
        leftItems={
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
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
      <Outlet />
    </>
  );
}
