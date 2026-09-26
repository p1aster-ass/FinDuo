// Chat helpers shared by the chat box and the 3D speech bubbles.

export const MAX_MESSAGE = 200;
// How long a message floats above its sender.
export const BUBBLE_MS = 6000;

// Splits a message into at most `maxLines` lines of about `width` characters,
// breaking between words where possible and ending with "…" if cut short.
export function wrapText(text, width = 22, maxLines = 3) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (let word of words) {
    while (word.length > width) {
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] = `${last.slice(0, width - 1)}…`;
  return kept;
}

// The newest message each person sent within the last BUBBLE_MS.
export function latestBubbles(messages, now = Date.now()) {
  const bubbles = {};
  for (const message of messages) {
    if (now - message.seenAt < BUBBLE_MS) bubbles[message.userId] = message.body;
  }
  return bubbles;
}
