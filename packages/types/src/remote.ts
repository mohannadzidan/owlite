export type RemoteMessage =
  | { type: "handshake"; screenWidth: number; screenHeight: number }
  | { type: "ping"; sentAt: number }
  | { type: "pong"; sentAt: number }
  | { type: "cursor_position"; x: number; y: number }
  | { type: "cursor_tap" }
  | { type: "cursor_scroll"; dy: number }
  | { type: "cursor_drag_start"; x: number; y: number }
  | { type: "cursor_drag_move"; x: number; y: number }
  | { type: "cursor_drag_end"; x: number; y: number }
  | { type: "remote_action"; shortcutId: string }
  | { type: "text_input_focused"; currentValue: string }
  | { type: "text_input_blurred" }
  | { type: "remote_text"; text: string }
  | { type: "remote_key"; key: string };
