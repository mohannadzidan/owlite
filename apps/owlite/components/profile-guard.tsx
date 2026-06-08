"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getClientProfileId } from "@/lib/profile-id";

export function ProfileGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/profiles") && !getClientProfileId()) {
      router.replace("/profiles");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
