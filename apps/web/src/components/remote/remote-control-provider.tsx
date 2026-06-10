import { connectionManager } from "@/lib/connection-manager";
import { useEffect } from "react";

export function RemoteControlProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    connectionManager.initialize();
    // Intentionally no cleanup — manager persists across navigations by design
  }, []);
  return <>{children}</>;
}
