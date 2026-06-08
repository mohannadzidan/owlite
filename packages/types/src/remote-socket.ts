import type { RemoteMessage } from "./remote";

export interface PairingRef {
  pairId: string;
  peerDeviceId: string;
}

export interface ClientToServerEvents {
  register: (data: { deviceId: string; deviceName: string; pairings: PairingRef[] }) => void;

  create_session: (callback: (res: { code: string } | { error: string }) => void) => void;

  accept_session: (
    data: { code: string; deviceId: string; deviceName: string },
    callback: (
      res: { pairId: string; acceptorDeviceId: string; acceptorName: string } | { error: string },
    ) => void,
  ) => void;

  remote_message: (data: { pairId: string; msg: RemoteMessage }) => void;

  remove_pairing: (data: { pairId: string }) => void;
}

export interface ServerToClientEvents {
  session_accepted: (data: {
    pairId: string;
    initiatorDeviceId: string;
    initiatorName: string;
  }) => void;

  peer_online: (data: { pairId: string }) => void;

  peer_offline: (data: { pairId: string }) => void;

  remote_message: (data: { pairId: string; msg: RemoteMessage }) => void;
}
