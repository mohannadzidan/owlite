import Link from "next/link";
import { Button } from "./ui/button";
import { Settings } from "lucide-react";

export default function SettingsButton() {
  return (
    <Button variant="ghost" size="icon" asChild>
      <Link href="/settings" aria-label="Settings">
        <Settings className="h-5 w-5" />
      </Link>
    </Button>
  );
}
