import { Outlet, createRootRoute, useRouter } from "@tanstack/react-router";
import { RemoteControlProvider } from "@/components/remote/remote-control-provider";
import { ProfileGuard } from "@/components/profile-guard";
import { Toaster } from "@/components/ui/sonner";
import { CursorOverlay } from "@/components/remote/cursor-overlay";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import "@/styles.css";

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RootErrorPage,
});

function RootErrorPage() {
  const router = useRouter();
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-background">
      <Empty className="border-none max-w-md">
        <EmptyHeader>
          <EmptyMedia>
            <TriangleAlert size={48} className="text-destructive" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">Something went wrong</EmptyTitle>
          <EmptyDescription>
            An unexpected error occurred. Please try returning to the homepage.
          </EmptyDescription>
        </EmptyHeader>
        <Button onClick={() => router.navigate({ to: "/" })}>Go to Homepage</Button>
      </Empty>
    </div>
  );
}

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
