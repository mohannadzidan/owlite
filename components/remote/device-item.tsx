"use client";

import { connectionManager } from "@/lib/connection-manager";
import type { PairingRecord } from "@/lib/remote-control-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

function StatusBadge({ status }: { status: PairingRecord["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "connected" && "bg-emerald-500/10 text-emerald-500",
        status === "connecting" && "bg-yellow-500/10 text-yellow-500",
        status === "offline" && "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "connected" && "bg-emerald-500",
          status === "connecting" && "animate-pulse bg-yellow-500",
          status === "offline" && "bg-muted-foreground",
        )}
      />
      {status === "connected" ? "Connected" : status === "connecting" ? "Connecting…" : "Offline"}
    </span>
  );
}

export function DeviceItem({ pairing }: { pairing: PairingRecord }) {
  const roleLabel =
    pairing.role === "initiator" ? "Controls this device" : "Controlled by this device";

  function handleRemove() {
    connectionManager.removePairing(pairing.pairId);
  }

  function handleSendTest() {
    connectionManager.sendMessage(pairing.pairId, "Hello from remote!");
  }

  return (
    <div className="flex items-center gap-4 rounded-xl bg-card px-5 py-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{pairing.peerDeviceName}</p>
        <p className="text-muted-foreground text-sm">{roleLabel}</p>
      </div>

      <StatusBadge status={pairing.status} />

      {pairing.status === "connected" && pairing.role === "initiator" && (
        <Button size="sm" variant="secondary" onClick={handleSendTest}>
          Send Test
        </Button>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="shrink-0 text-muted-foreground"
        onClick={handleRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
