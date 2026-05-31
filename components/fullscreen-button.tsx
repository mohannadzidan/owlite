"use client";

import { MaximizeIcon, MinimizeIcon } from "lucide-react";
import { useState } from "react";

export default function FullScreenButton() {
  const [maximized, setMaximized] = useState(
    typeof document !== "undefined" && !!document.fullscreenElement,
  );
  return (
    <button
      className="text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
          setMaximized(false);
        } else {
          document.body.requestFullscreen();
          setMaximized(true);
        }
      }}
    >
      {maximized ? <MinimizeIcon className="h-5 w-5" /> : <MaximizeIcon className="h-5 w-5" />}
    </button>
  );
}
