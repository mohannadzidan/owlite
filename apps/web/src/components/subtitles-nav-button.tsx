import { Link } from "@tanstack/react-router";
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
      <Link to={paths.subtitles(type, id) as any}>
        <Languages className="size-5" />
      </Link>
    </Button>,
  );
  return null;
}
