"use client";

import { connectionManager } from "@/lib/connection-manager";
import { useRemoteControlStore } from "@/lib/remote-control-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

function ShareCodeTab({ onClose }: { onClose: () => void }) {
  const pendingCode = useRemoteControlStore((s) => s.pendingSessionCode);
  const [codeGenerated, setCodeGenerated] = useState(false);

  // Close when pairing completes (pendingCode cleared after being set)
  useEffect(() => {
    if (codeGenerated && pendingCode === null) {
      onClose();
    }
  }, [pendingCode, codeGenerated, onClose]);

  async function handleShare() {
    setCodeGenerated(true);
    await connectionManager.createSession();
  }

  if (!codeGenerated) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <p className="text-muted-foreground text-center text-sm">
          This device will be controlled. The other device enters the code below.
        </p>
        <Button onClick={handleShare}>Generate Code</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-muted-foreground text-sm">Show this code on the remote device</p>
      {pendingCode ? (
        <p className="font-mono text-5xl font-bold tracking-widest">{pendingCode}</p>
      ) : (
        <div className="h-16 flex items-center">
          <p className="text-muted-foreground animate-pulse text-sm">Paired! Connecting…</p>
        </div>
      )}
      <p className="text-muted-foreground text-xs">Waiting for remote device to connect…</p>
    </div>
  );
}

function EnterCodeTab({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    const code = input.trim().toUpperCase();
    if (!code) return;
    setConnecting(true);
    setError(null);
    try {
      await connectionManager.acceptSession(code);
      onClose();
    } catch {
      setError("Invalid or expired code. Try again.");
      setConnecting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-muted-foreground text-center text-sm">
        This device will act as the remote control.
      </p>
      <div className="flex gap-2">
        <Input
          className="font-mono text-center text-lg tracking-widest uppercase w-36"
          placeholder="ABC123"
          value={input}
          maxLength={6}
          disabled={connecting}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
        />
        <Button onClick={handleConnect} disabled={connecting || input.trim().length === 0}>
          {connecting ? "Connecting…" : "Connect"}
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

export function PairingDialog() {
  const [open, setOpen] = useState(false);

  function handleClose() {
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Device</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="share">
          <TabsList className="w-full">
            <TabsTrigger value="share" className="flex-1">
              Share Code
            </TabsTrigger>
            <TabsTrigger value="enter" className="flex-1">
              Enter Code
            </TabsTrigger>
          </TabsList>
          <TabsContent value="share">
            <ShareCodeTab onClose={handleClose} />
          </TabsContent>
          <TabsContent value="enter">
            <EnterCodeTab onClose={handleClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
