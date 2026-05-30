"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

function isHls(url: string) {
  return url.includes(".m3u8") || url.includes("/api/hls-proxy");
}

function PlayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = decodeURIComponent(searchParams.get("url") ?? "");
  const title = decodeURIComponent(searchParams.get("title") ?? "");

  return (
    <div className="bg-black flex h-screen flex-col">
      <div className="flex flex-1 items-center justify-center">
        {url ? (
          isHls(url) ? (
            <ReactPlayer src={url} playing controls width="90%" height="85%" />
          ) : (
            <video src={url} autoPlay controls className="h-[85%] w-[90%] rounded-lg" />
          )
        ) : (
          <p className="text-muted-foreground">No video URL provided.</p>
        )}
      </div>
      <div className="border-border bg-card flex h-16 flex-shrink-0 items-center justify-between border-t px-8">
        <span className="text-foreground text-sm font-medium">{title}</span>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            Subtitles
          </Button>
          <Button variant="destructive" size="sm" onClick={() => router.back()}>
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense>
      <PlayerContent />
    </Suspense>
  );
}
