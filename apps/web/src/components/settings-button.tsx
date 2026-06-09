import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Settings } from "lucide-react";

export default function SettingsButton() {
  return (
    <Button variant="ghost" size="icon" asChild>
      <Link to={"/settings" as any} aria-label="Settings">
        <Settings className="h-5 w-5" />
      </Link>
    </Button>
  );
}
