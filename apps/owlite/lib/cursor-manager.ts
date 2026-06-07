"use client";

import { connectionManager } from "@/lib/connection-manager";
import { useRemoteControlStore } from "@/lib/remote-control-store";
import { shortcutsStore } from "@/lib/shortcuts/store";
import { cursorService } from "@/services/cursor.service";
import type { RemoteMessage } from "@/lib/remote-messages";

const INACTIVITY_TIMEOUT_MS = 3000;

function isTextInput(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLInputElement) {
    const t = el.type.toLowerCase();
    return (
      t !== "hidden" &&
      t !== "checkbox" &&
      t !== "radio" &&
      t !== "submit" &&
      t !== "button" &&
      t !== "reset" &&
      t !== "image" &&
      t !== "file" &&
      t !== "range" &&
      t !== "color"
    );
  }
  if (el instanceof HTMLTextAreaElement) return true;
  return (el as HTMLElement).isContentEditable;
}

class CursorManager {
  private cursorEl: HTMLElement | null = null;
  private wrapperEl: HTMLElement | null = null;
  private pos = { x: 0, y: 0 };
  private inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
  private activePairId: string | null = null;
  private routerBack: () => void = () => {};

  attach(cursorEl: HTMLElement, wrapperEl: HTMLElement, routerBack: () => void) {
    this.cursorEl = cursorEl;
    this.wrapperEl = wrapperEl;
    this.routerBack = routerBack;
    connectionManager.setMessageHandler(this.handleMessage);
    document.addEventListener("focusin", this.handleFocusIn);
    document.addEventListener("focusout", this.handleFocusOut);
  }

  detach() {
    connectionManager.clearMessageHandler();
    document.removeEventListener("focusin", this.handleFocusIn);
    document.removeEventListener("focusout", this.handleFocusOut);
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
    useRemoteControlStore.getState().setCursorActive(false);
    this.cursorEl = null;
    this.wrapperEl = null;
    this.activePairId = null;
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

  private notify(msg: RemoteMessage) {
    if (this.activePairId) connectionManager.sendRemoteMessage(this.activePairId, msg);
  }

  private handleFocusIn = (e: FocusEvent) => {
    if (!(e.target instanceof Element) || !isTextInput(e.target)) return;
    const currentValue = "value" in e.target ? (e.target as HTMLInputElement).value : "";
    this.notify({ type: "text_input_focused", currentValue });
  };

  private handleFocusOut = (e: FocusEvent) => {
    if (e.target instanceof Element && isTextInput(e.target)) {
      this.notify({ type: "text_input_blurred" });
    }
  };

  private setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const proto =
      el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private handleRemoteText(text: string) {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const newValue = el.value.slice(0, start) + text + el.value.slice(end);
      this.setNativeValue(el, newValue);
      el.setSelectionRange(start + text.length, start + text.length);
    } else if (el instanceof HTMLElement && el.isContentEditable) {
      const sel = window.getSelection();
      if (sel?.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  private handleRemoteKey(key: string) {
    if (key === "BrowserBack") {
      this.routerBack();
      return;
    }
    const el = document.activeElement;
    if (
      key === "Backspace" &&
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
    ) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const newValue =
        start !== end
          ? el.value.slice(0, start) + el.value.slice(end)
          : start > 0
            ? el.value.slice(0, start - 1) + el.value.slice(start)
            : el.value;
      const newCursor = start !== end ? start : Math.max(0, start - 1);
      this.setNativeValue(el, newValue);
      el.setSelectionRange(newCursor, newCursor);
    } else {
      const target = el ?? document.body;
      target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
      target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }));
    }
  }

  private handleMessage = (pairId: string, msg: RemoteMessage) => {
    this.activePairId = pairId;

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
    } else if (msg.type === "remote_text") {
      this.handleRemoteText(msg.text);
    } else if (msg.type === "remote_key") {
      this.handleRemoteKey(msg.key);
    }
  };
}

export const cursorManager = new CursorManager();
