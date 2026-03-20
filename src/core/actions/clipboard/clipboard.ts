// Clipboard Actions

import clipboardy from "clipboardy";
import type { ActionResult } from "../../../types/action-result.js";

export const clipboardCopy = (text: string): ActionResult => {
  try {
    clipboardy.writeSync(text);
    return [true, "Copied to clipboard"];
  } catch (e) {
    return [false, String(e)];
  }
};

export const getClipboardText = (): ActionResult => {
  try {
    const text = clipboardy.readSync();
    return [true, text];
  } catch (e) {
    return [false, String(e)];
  }
};

export const ACTIONS: Record<
  string,
  (args: any) => ActionResult | Promise<ActionResult>
> = {
  CLIPBOARD_COPY: (args) => clipboardCopy(args.text || ""),
  CLIPBOARD_PASTE: () => getClipboardText(),
  GET_CLIPBOARD_TEXT: () => getClipboardText(),
};

export const ACTION_ARGS: Record<string, string[]> = {
  CLIPBOARD_COPY: ["text"],
  CLIPBOARD_PASTE: [],
  GET_CLIPBOARD_TEXT: [],
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  CLIPBOARD_COPY: "Copies provided text to the system clipboard.",
  CLIPBOARD_PASTE:
    "Pastes or returns the current text from the system clipboard.",
  GET_CLIPBOARD_TEXT:
    "Returns the current text stored in the system clipboard.",
};
