import { Outlet, createRootRoute } from "@tanstack/react-router";
import { RemoteControlProvider } from "@/components/remote/remote-control-provider";
import { ProfileGuard } from "@/components/profile-guard";
import { Toaster } from "@/components/ui/sonner";
import { CursorOverlay } from "@/components/remote/cursor-overlay";
import "@/styles.css";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <RemoteControlProvider>
      <ProfileGuard>
        <Outlet />
        <Toaster />
        <CursorOverlay />
      </ProfileGuard>
    </RemoteControlProvider>
  );
}
