import { cursorManager } from "@/lib/cursor-manager";
import { useEffect, useRef } from "react";

export function CursorOverlay() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cursorManager.attach(cursorRef.current!, wrapperRef.current!, () => window.history.back());
    return () => cursorManager.detach();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none fixed inset-0 z-[9999] opacity-0 transition-opacity"
      aria-hidden
    >
      <div
        ref={cursorRef}
        className="absolute top-0 left-0 h-5 w-5 rounded-full border-2 border-white bg-white/30 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
      />
    </div>
  );
}
