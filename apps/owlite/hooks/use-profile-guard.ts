"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getClientProfileId } from "@/lib/profile-id";

export function useProfileGuard() {
  const router = useRouter();
  useEffect(() => {
    if (!getClientProfileId()) {
      router.replace("/profiles");
    }
  }, [router]);
}
