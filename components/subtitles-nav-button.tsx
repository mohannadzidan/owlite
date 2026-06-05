"use client";
import Link from "next/link";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paths } from "@/lib/paths";
import { useNavigationBarRightItem } from "@/hooks/use-navigation-bar-right-item";

interface SubtitlesNavButtonProps {
  type: "movie" | "tv";
  id: number;
}

export function SubtitlesNavButton({ type, id }: SubtitlesNavButtonProps) {
  useNavigationBarRightItem(
    <Button key="subtitles-nav" variant="ghost" size="icon" asChild>
      <Link href={paths.subtitles(type, id)}>
        <Languages className="size-5" />
      </Link>
    </Button>,
  );
  return null;
}
