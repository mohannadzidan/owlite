const SCROLL_SENSITIVITY = 3;

function dispatchPointerAndMouse(
  element: Element,
  pointerType: string,
  mouseType: string,
  x: number,
  y: number,
) {
  const shared = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
  };
  element.dispatchEvent(
    new PointerEvent(pointerType, { ...shared, pointerId: 1, isPrimary: true }),
  );
  element.dispatchEvent(new MouseEvent(mouseType, shared));
}

export const cursorService = {
  tap(x: number, y: number) {
    const element = document.elementFromPoint(x, y);
    if (
      element &&
      (element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.getAttribute("contenteditable") === "true")
    ) {
      (element as HTMLElement).focus();
    } else if (element) {
      if ((element as HTMLElement).click) {
        (element as HTMLElement).click();
      } else {
        element.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }),
        );
      }
    } else {
      document.documentElement.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }),
      );
    }
  },

  scroll(x: number, y: number, dy: number) {
    const scrollable = document
      .elementsFromPoint(x, y)
      .find((el) => el.getAttribute("data-scrollable") === "true");

    if (scrollable) {
      scrollable.scrollBy({ top: dy * SCROLL_SENSITIVITY, behavior: "auto" });
    } else {
      window.scrollBy({ top: dy * SCROLL_SENSITIVITY, behavior: "auto" });
    }
  },

  dragStart(x: number, y: number) {
    const target = document.elementFromPoint(x, y) ?? document.documentElement;
    dispatchPointerAndMouse(target, "pointerdown", "mousedown", x, y);
  },

  dragMove(x: number, y: number) {
    const target = document.elementFromPoint(x, y) ?? document.documentElement;
    dispatchPointerAndMouse(target, "pointermove", "mousemove", x, y);
  },

  dragEnd(x: number, y: number) {
    const target = document.elementFromPoint(x, y) ?? document.documentElement;
    dispatchPointerAndMouse(target, "pointerup", "mouseup", x, y);
    target.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }),
    );
  },
};
