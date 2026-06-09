import { Link } from "@tanstack/react-router";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigationBarRightItem } from "@/hooks/use-navigation-bar-right-item";

interface SubtitlesNavButtonProps {
  type: "movie" | "tv";
  id: number;
}

export function SubtitlesNavButton({ type, id }: SubtitlesNavButtonProps) {
  useNavigationBarRightItem(
    <Button key="subtitles-nav" variant="ghost" size="icon" asChild>
      <Link
        to={"/media/$type/$id/subtitles"}
        params={{ type, id: id.toString() }}
      >
        <Languages className="size-5" />
      </Link>
    </Button>,
  );
  return null;
}
