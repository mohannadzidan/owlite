"use client";

import { DeviceList } from "@/components/remote/device-list";
import { PairingDialog } from "@/components/remote/pairing-dialog";

export default function RemotePage() {
  return (
    <div className="min-h-screen w-full container max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Remote Control</h1>
        <PairingDialog />
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Paired Devices
        </h2>
        <DeviceList />
      </section>
    </div>
  );
}
