export function splitLines(input: string) {
  const lines = input.match(/.*(?:$|\r?\n)/g)?.filter(Boolean) ?? []; // Split lines and keep newline character
  if (lines.length > 0 && lines[lines.length - 1]?.endsWith("\n")) {
    // Keep last empty line
    lines.push("");
  }
  return lines;
}

export function splitWords(input: string) {
  return input.match(/\w+|\W+/g)?.filter(Boolean) ?? []; // Split consecutive words and non-words
}

export function isBlank(input: string) {
  return input.trim().length === 0;
}

// Indentation

export function getIndentationLevel(line: string, indentation?: string) {
  if (indentation === undefined) {
    return line.match(/^[ \t]*/)?.[0]?.length ?? 0;
  } else if (indentation === "\t") {
    return line.match(/^\t*/)?.[0].length ?? 0;
  } else if (indentation.match(/^ *$/)) {
    const spaces = line.match(/^ */)?.[0].length ?? 0;
    return spaces / indentation.length;
  } else {
    throw new Error(`Invalid indentation: ${indentation}`);
  }
}

// function foo(a) {  // <-- block opening line
//   return a;
// }                  // <-- block closing line
export function isBlockOpeningLine(lines: string[], index: number): boolean {
  if (index < 0 || index >= lines.length - 1) {
    return false;
  }
  return getIndentationLevel(lines[index]!) < getIndentationLevel(lines[index + 1]!);
}

export function isBlockClosingLine(lines: string[], index: number): boolean {
  if (index <= 0 || index > lines.length - 1) {
    return false;
  }
  return getIndentationLevel(lines[index - 1]!) > getIndentationLevel(lines[index]!);
}

// Auto-closing chars
type AutoClosingCharPosition = "open" | "close" | "openOrClose";
type AutoClosingCharPattern = { chars: string; reg: RegExp };
type AutoClosingPairDifferent = { open: AutoClosingCharPattern; close: AutoClosingCharPattern };
type AutoClosingPairSame = { openOrClose: AutoClosingCharPattern };
type AutoClosingPair = AutoClosingPairDifferent | AutoClosingPairSame;

// FIXME: use syntax parser instead
export const autoClosingPairs: AutoClosingPair[] = [
  {
    open: {
      chars: "(",
      reg: /\(/,
    },
    close: {
      chars: ")",
      reg: /\)/,
    },
  },
  {
    open: {
      chars: "[",
      reg: /\[/,
    },
    close: {
      chars: "]",
      reg: /\]/,
    },
  },
  {
    open: {
      chars: "{",
      reg: /\{/,
    },
    close: {
      chars: "}",
      reg: /\}/,
    },
  },
  {
    open: {
      chars: "<",
      reg: /<(?=\w)/,
    },
    close: {
      chars: "/>",
      reg: /\/>/,
    },
  },
  {
    open: {
      chars: "<",
      reg: /<(?=[/\w])/,
    },
    close: {
      chars: ">",
      reg: />/,
    },
  },
  {
    openOrClose: {
      chars: '"',
      reg: /"/,
    },
  },
  {
    openOrClose: {
      chars: "'",
      reg: /'/,
    },
  },
  {
    openOrClose: {
      chars: "`",
      reg: /`/,
    },
  },
];

export const regOnlyAutoClosingCloseChars = /^([)\]}>"'`]|(\/>))*$/g;

// FIXME: This function is not good enough, it can not handle escaped characters.
export function findUnpairedAutoClosingChars(input: string): string[] {
  const stack: string[] = [];
  let index = 0;
  while (index < input.length) {
    const remain = input.slice(index);
    let nextFound: {
      index: number;
      found: { pair: AutoClosingPair; pos: AutoClosingCharPosition; pattern: AutoClosingCharPattern } | undefined;
    } = {
      index: remain.length,
      found: undefined,
    };
    autoClosingPairs.forEach((pair) => {
      Object.entries(pair).forEach(([pos, pattern]) => {
        const match = remain.match(pattern.reg);
        if (match && match.index !== undefined && match.index < nextFound.index) {
          nextFound = {
            index: match.index,
            found: { pair, pos: pos as AutoClosingCharPosition, pattern },
          };
        }
      });
    });
    if (!nextFound.found) {
      break;
    }
    switch (nextFound.found.pos) {
      case "openOrClose": {
        const chars = nextFound.found.pattern.chars;
        if (stack.length > 0 && stack.includes(chars)) {
          stack.splice(stack.lastIndexOf(chars), stack.length - stack.lastIndexOf(chars));
        } else {
          stack.push(chars);
        }
        break;
      }
      case "open": {
        stack.push(nextFound.found.pattern.chars);
        break;
      }
      case "close": {
        const pair = nextFound.found.pair;
        if (stack.length > 0 && "open" in pair && stack[stack.length - 1] === pair.open.chars) {
          stack.pop();
        } else {
          stack.push(nextFound.found.pattern.chars);
        }
        break;
      }
    }
    index += nextFound.index + nextFound.found.pattern.chars.length;
  }
  return stack;
}

// Using string levenshtein distance is not good, because variable name may create a large distance.
// Such as distance is 9 between `const fooFooFoo = 1;` and `const barBarBar = 1;`, but maybe 1 is enough.
// May be better to count distance based on words instead of characters.
import * as levenshtein from "fast-levenshtein";
export function calcDistance(a: string, b: string) {
  return levenshtein.get(a, b);
}

// Polyfill for AbortSignal.any(signals) which added in Node.js v20.
export function abortSignalFromAnyOf(signals: (AbortSignal | undefined)[]) {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal?.aborted) {
      controller.abort(signal.reason);
      return signal;
    }
    signal?.addEventListener("abort", () => controller.abort(signal.reason), {
      signal: controller.signal,
    });
  }
  return controller.signal;
}

// Http Error
export class HttpError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly response: Response;

  constructor(response: Response) {
    super(`${response.status} ${response.statusText}`);
    this.name = "HttpError";
    this.status = response.status;
    this.statusText = response.statusText;
    this.response = response;
  }
}

export function isTimeoutError(error: any) {
  return (
    (error instanceof Error && error.name === "TimeoutError") ||
    (error instanceof HttpError && [408, 499].includes(error.status))
  );
}

export function isCanceledError(error: any) {
  return error instanceof Error && error.name === "AbortError";
}

export function isUnauthorizedError(error: any) {
  return error instanceof HttpError && [401, 403].includes(error.status);
}

export function errorToString(error: Error & { cause?: Error }) {
  let message = error.message || error.toString();
  if (error.cause) {
    message += "\nCaused by: " + errorToString(error.cause);
  }
  return message;
}

import type { components as TabbyApiComponents } from "./types/tabbyApi";
export async function* readChatStream(response: Response): AsyncGenerator<string> {
  const streamReader = response.body?.getReader();
  const textDecoder = new TextDecoder("utf8");
  let streamClosed = false;
  while (streamReader && !streamClosed) {
    const { done, value } = await streamReader.read();
    if (value) {
      const raw = textDecoder.decode(Buffer.from(value));
      const header = "data: ";
      if (raw.startsWith(header)) {
        const data = JSON.parse(raw.slice(header.length)) as TabbyApiComponents["schemas"]["ChatCompletionChunk"];
        streamClosed ||= !!data.choices[0]?.finish_reason;
        const delta = data.choices[0]?.delta.content;
        if (typeof delta === "string") {
          yield delta;
        }
      }
    }
    streamClosed ||= done;
  }
}

export async function parseChatResponse(response: Response, signal?: AbortSignal): Promise<string> {
  const tokens: string[] = [];
  for await (const token of readChatStream(response)) {
    if (signal?.aborted) {
      break;
    }
    tokens.push(token);
  }
  return tokens.join("");
}
