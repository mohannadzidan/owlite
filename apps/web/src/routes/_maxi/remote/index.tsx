import { createFileRoute } from "@tanstack/react-router";
import { DeviceList } from "@/components/remote/device-list";
import { PairingDialog } from "@/components/remote/pairing-dialog";

export const Route = createFileRoute("/_maxi/remote/")({
  component: RemotePage,
});

function RemotePage() {
  return (
    <main className="pt-16 p-8 flex flex-col h-screen">
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
    </main>
  );
}
