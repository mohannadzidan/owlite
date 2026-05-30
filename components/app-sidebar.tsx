"use client";

import {
  CalendarIcon,
  CompassIcon,
  HomeIcon,
  LibraryIcon,
  PuzzleIcon,
  SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: HomeIcon, label: "Home", active: true },
  { icon: CompassIcon, label: "Discover" },
  { icon: LibraryIcon, label: "Library" },
  { icon: CalendarIcon, label: "Schedule" },
  { icon: PuzzleIcon, label: "Plugins" },
];

export function AppSidebar() {
  return (
    <aside className="bg-sidebar border-sidebar-border flex w-16 flex-shrink-0 flex-col items-center border-r py-6">
      <div className="bg-primary mb-8 flex h-9 w-9 items-center justify-center rounded-lg">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-white"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {NAV.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            title={label}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </nav>

      <button
        title="Settings"
        className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-11 w-11 items-center justify-center rounded-xl transition-colors"
      >
        <SettingsIcon className="h-5 w-5" />
      </button>
    </aside>
  );
}
