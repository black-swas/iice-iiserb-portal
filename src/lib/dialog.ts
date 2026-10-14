"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes a modal `<dialog>` when the backdrop is clicked. This is a pointer convenience only: keyboard and assistive
 * technology users close the dialog with Escape, which the browser handles natively, and with its visible close button.
 * (A click on the backdrop is delivered to the dialog element itself, so a click on its content never matches.)
 */
export function useBackdropClose(ref: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, [ref]);
}
