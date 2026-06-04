"use client";

import FullScreenButton from "@/components/fullscreen-button";
import React from "react";
import { Navigation } from "@/components/navigation";
import SettingsButton from "@/components/settings-button";

export default function Layout({ children }: React.PropsWithChildren) {
  return (
    <>
      {/* Header */}
      <Navigation
        className="fixed top-0 left-0 w-full"
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
