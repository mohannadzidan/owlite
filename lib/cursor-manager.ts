"use client";

import { connectionManager } from "@/lib/connection-manager";
import { useRemoteControlStore } from "@/lib/remote-control-store";
import { shortcutsStore } from "@/lib/shortcuts/store";
import { cursorService } from "@/services/cursor.service";
import type { RemoteMessage } from "@/lib/remote-messages";

const INACTIVITY_TIMEOUT_MS = 3000;

class CursorManager {
  private cursorEl: HTMLElement | null = null;
  private wrapperEl: HTMLElement | null = null;
  private pos = { x: 0, y: 0 };
  private inactivityTimeout: ReturnType<typeof setTimeout> | null = null;

  attach(cursorEl: HTMLElement, wrapperEl: HTMLElement) {
    this.cursorEl = cursorEl;
    this.wrapperEl = wrapperEl;
    connectionManager.setMessageHandler(this.handleMessage);
  }

  detach() {
    connectionManager.clearMessageHandler();
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
    useRemoteControlStore.getState().setCursorActive(false);
    this.cursorEl = null;
    this.wrapperEl = null;
  }

  private bumpActive() {
    if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);
    if (this.wrapperEl) this.wrapperEl.style.opacity = "1";
    useRemoteControlStore.getState().setCursorActive(true);
    this.inactivityTimeout = setTimeout(() => {
      if (this.wrapperEl) this.wrapperEl.style.opacity = "0";
      useRemoteControlStore.getState().setCursorActive(false);
    }, INACTIVITY_TIMEOUT_MS);
  }

  private handleMessage = (_pairId: string, msg: RemoteMessage) => {
    if (msg.type === "cursor_position") {
      this.pos = { x: msg.x, y: msg.y };
      this.bumpActive();
      if (this.cursorEl) {
        this.cursorEl.style.transform = `translate(calc(${msg.x}px - 50%), calc(${msg.y}px - 50%))`;
      }
    } else if (msg.type === "cursor_tap") {
      cursorService.tap(this.pos.x, this.pos.y);
    } else if (msg.type === "cursor_scroll") {
      cursorService.scroll(this.pos.x, this.pos.y, msg.dy);
    } else if (msg.type === "remote_action") {
      shortcutsStore.getState().triggerById(msg.shortcutId);
    }
  };
}

export const cursorManager = new CursorManager();
