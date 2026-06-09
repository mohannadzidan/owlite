
import { connectionManager } from "@/lib/connection-manager";
import { useRemoteControlStore } from "@/lib/remote-control-store";
import { DeviceItem } from "@/components/remote/device-item";

export function DeviceList() {
  const pairings = useRemoteControlStore((s) => s.pairings);

  if (pairings.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No paired devices yet. Add one below.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {pairings.map((p) => (
        <DeviceItem
          key={p.pairId}
          pairing={p}
          onRemove={() => connectionManager.removePairing(p.pairId)}
        />
      ))}
    </div>
  );
}
