import type { Message } from "../shared/messages";

browser.commands.onCommand.addListener(async (command) => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return;

  let msg: Message | null = null;
  if (command === "fill-form")           msg = { type: "trigger_fill" };
  if (command === "open-snippet-picker") msg = { type: "trigger_snippet_picker" };
  if (!msg) return;

  try {
    await browser.tabs.sendMessage(tab.id, msg);
  } catch (err) {
    console.warn("[jobfill] could not deliver message; content script may not be loaded:", err);
  }
});

console.log("[jobfill] background ready");
