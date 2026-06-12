import { connectionManager } from "@/lib/connection-manager";

const TAP_MAX_DURATION_MS = 250;
const TAP_MAX_MOVEMENT_PX = 12;
const SENSITIVITY = 2;
const DOUBLE_TAP_MAX_GAP_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 20;

interface PointerState {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
}

export interface TrackpadGestureOptions {
  pairId: string;
  tvW: number;
  tvH: number;
}

export interface TrackpadGesture {
  update(opts: Partial<TrackpadGestureOptions>): void;
  destroy(): void;
}

export function createTrackpadGesture(
  el: HTMLElement,
  opts: TrackpadGestureOptions,
): TrackpadGesture {
  const pointers = new Map<number, PointerState>();
  const virtualPos = { x: opts.tvW / 2, y: opts.tvH / 2 };
  let { pairId, tvW, tvH } = opts;
  let pendingPos: { x: number; y: number } | null = null;
  let rafId = 0;
  let lastTapVirtualX = 0;
  let lastTapVirtualY = 0;
  let isDragging = false;
  let pendingTapTimer: ReturnType<typeof setTimeout> | null = null;

  function flushPosition() {
    rafId = 0;
    if (!pendingPos) return;
    connectionManager.sendRemoteMessage(pairId, {
      type: "cursor_position",
      x: pendingPos.x,
      y: pendingPos.y,
    });
    pendingPos = null;
  }

  function scheduleFlush(x: number, y: number) {
    pendingPos = { x, y };
    if (!rafId) rafId = requestAnimationFrame(flushPosition);
  }

  function flushPendingTap() {
    if (pendingTapTimer === null) return;
    clearTimeout(pendingTapTimer);
    pendingTapTimer = null;
    connectionManager.sendRemoteMessage(pairId, { type: "cursor_tap" });
  }

  function cancelPendingTap() {
    if (pendingTapTimer === null) return;
    clearTimeout(pendingTapTimer);
    pendingTapTimer = null;
  }

  function onPointerDown(e: PointerEvent) {
    el.setPointerCapture(e.pointerId);

    if (pendingTapTimer !== null) {
      const distFromLastTap = Math.sqrt(
        (virtualPos.x - lastTapVirtualX) ** 2 + (virtualPos.y - lastTapVirtualY) ** 2,
      );

      if (pointers.size === 0 && distFromLastTap < DOUBLE_TAP_MAX_DISTANCE_PX) {
        cancelPendingTap();
        isDragging = true;
        connectionManager.sendRemoteMessage(pairId, {
          type: "cursor_drag_start",
          x: virtualPos.x,
          y: virtualPos.y,
        });
      } else {
        flushPendingTap();
      }
    }

    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
    });
  }

  function onPointerMove(e: PointerEvent) {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { ...prev, x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      virtualPos.x = Math.max(0, Math.min(tvW, virtualPos.x + dx * SENSITIVITY));
      virtualPos.y = Math.max(0, Math.min(tvH, virtualPos.y + dy * SENSITIVITY));

      if (isDragging) {
        connectionManager.sendRemoteMessage(pairId, {
          type: "cursor_drag_move",
          x: virtualPos.x,
          y: virtualPos.y,
        });
      } else {
        scheduleFlush(virtualPos.x, virtualPos.y);
      }
    } else if (pointers.size === 2 && dy !== 0) {
      connectionManager.sendRemoteMessage(pairId, { type: "cursor_scroll", dy });
    }
  }

  function onPointerUp(e: PointerEvent) {
    const info = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (!info) return;

    if (isDragging && pointers.size === 0) {
      isDragging = false;
      connectionManager.sendRemoteMessage(pairId, {
        type: "cursor_drag_end",
        x: virtualPos.x,
        y: virtualPos.y,
      });
      return;
    }

    const duration = Date.now() - info.startTime;
    const movedX = Math.abs(e.clientX - info.startX);
    const movedY = Math.abs(e.clientY - info.startY);

    if (
      pointers.size === 0 &&
      duration < TAP_MAX_DURATION_MS &&
      movedX < TAP_MAX_MOVEMENT_PX &&
      movedY < TAP_MAX_MOVEMENT_PX
    ) {
      lastTapVirtualX = virtualPos.x;
      lastTapVirtualY = virtualPos.y;
      pendingTapTimer = setTimeout(() => {
        pendingTapTimer = null;
        connectionManager.sendRemoteMessage(pairId, { type: "cursor_tap" });
      }, DOUBLE_TAP_MAX_GAP_MS);
    }
  }

  function onPointerCancel(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (isDragging && pointers.size === 0) {
      isDragging = false;
      connectionManager.sendRemoteMessage(pairId, {
        type: "cursor_drag_end",
        x: virtualPos.x,
        y: virtualPos.y,
      });
    }
  }

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerCancel);

  return {
    update(newOpts) {
      if (newOpts.pairId !== undefined) pairId = newOpts.pairId;
      if (newOpts.tvW !== undefined || newOpts.tvH !== undefined) {
        if (newOpts.tvW !== undefined) tvW = newOpts.tvW;
        if (newOpts.tvH !== undefined) tvH = newOpts.tvH;
        virtualPos.x = tvW / 2;
        virtualPos.y = tvH / 2;
      }
    },
    destroy() {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      if (rafId) cancelAnimationFrame(rafId);
      cancelPendingTap();
    },
  };
}
