const SCROLL_SENSITIVITY = 3;

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
};
