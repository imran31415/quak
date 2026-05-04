// Qwen 3's `/no_think` mode still emits empty <think></think> tags around
// each response. Strip them so the chat UI never sees the reasoning markers.
// State machine across streamed chunks: tags can split across deltas, so we
// hold a small lookahead buffer when no tag boundary is in sight.

const OPEN = '<think>';
const CLOSE = '</think>';
const HOLD = Math.max(OPEN.length, CLOSE.length);

export interface ThinkStripper {
  /** Feed a content delta. Returns text that should be forwarded (may be ''). */
  process(delta: string): string;
  /** Flush any remaining buffered text at end of stream. */
  flush(): string;
}

export function createThinkStripper(): ThinkStripper {
  let thinking = false;
  let buf = '';
  let stripLeadingWs = false;

  function drain(): string {
    let out = '';
    while (true) {
      if (thinking) {
        const i = buf.indexOf(CLOSE);
        if (i === -1) {
          // Hold last (CLOSE.length - 1) chars in case CLOSE is split across deltas.
          buf = buf.slice(Math.max(0, buf.length - (CLOSE.length - 1)));
          return out;
        }
        buf = buf.slice(i + CLOSE.length);
        thinking = false;
        stripLeadingWs = true;
      } else {
        if (stripLeadingWs) {
          const trimmed = buf.replace(/^\s+/, '');
          if (trimmed.length === 0) {
            buf = '';
            return out;
          }
          if (trimmed !== buf) {
            buf = trimmed;
            stripLeadingWs = false;
          } else {
            stripLeadingWs = false;
          }
        }
        const i = buf.indexOf(OPEN);
        if (i === -1) {
          // Could be partial tag at end — hold last HOLD chars.
          if (buf.length > HOLD) {
            out += buf.slice(0, buf.length - HOLD);
            buf = buf.slice(buf.length - HOLD);
          }
          return out;
        }
        out += buf.slice(0, i);
        buf = buf.slice(i + OPEN.length);
        thinking = true;
      }
    }
  }

  return {
    process(delta: string): string {
      buf += delta;
      return drain();
    },
    flush(): string {
      // End of stream: emit anything left in buf if we're not still thinking.
      if (thinking) return '';
      const out = buf;
      buf = '';
      return out;
    },
  };
}
