type PairedSession = {
  paired: true;
  pairId: string;
  initiatorDeviceId: string;
  initiatorName: string;
};

export const remoteControlService = {
  createSession: (deviceId: string, deviceName: string): Promise<{ code: string }> =>
    fetch("/api/remote/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, deviceName }),
    }).then((r) => r.json()),

  pollSession: (code: string): Promise<{ paired: false } | PairedSession> =>
    fetch(`/api/remote/sessions/${code}`).then((r) => r.json()),

  acceptSession: (
    code: string,
    deviceId: string,
    deviceName: string,
  ): Promise<{ pairId: string; acceptorDeviceId: string; acceptorName: string }> =>
    fetch(`/api/remote/sessions/${code}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, deviceName }),
    }).then((r) => r.json()),

  sendHeartbeat: (deviceId: string): Promise<void> =>
    fetch(`/api/remote/devices/${deviceId}/heartbeat`, { method: "POST" }).then(() => {}),

  checkPresence: (deviceId: string): Promise<boolean> =>
    fetch(`/api/remote/devices/${deviceId}/presence`)
      .then((r) => r.json())
      .then((body: { online: boolean }) => body.online),

  sendPairSignal: (pairId: string, from: "initiator" | "acceptor", data: object): Promise<void> =>
    fetch(`/api/remote/pairs/${pairId}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, data }),
    }).then(() => {}),

  drainPairSignals: (pairId: string, from: "initiator" | "acceptor"): Promise<object[]> =>
    fetch(`/api/remote/pairs/${pairId}/signal?from=${from}`)
      .then((r) => r.json())
      .then((body: { signals?: object[] }) => (Array.isArray(body.signals) ? body.signals : [])),

  removePairing: (pairId: string): Promise<void> =>
    fetch(`/api/remote/pairs/${pairId}`, { method: "DELETE" }).then(() => {}),
};
