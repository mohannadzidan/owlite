"use client";

import { MaximizeIcon, MinimizeIcon } from "lucide-react";
import { useState } from "react";

export default function FullScreenButton() {
  const [maximized, setMaximized] = useState(
    typeof document !== "undefined" && !!document.fullscreenElement,
  );
  return (
    <button
      onClick={() => {
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
          setMaximized(false);
        } else {
          document.documentElement.requestFullscreen();
          setMaximized(true);
        }
      }}
    >
      {maximized ? <MinimizeIcon className="h-5 w-5" /> : <MaximizeIcon className="h-5 w-5" />}
    </button>
  );
}
