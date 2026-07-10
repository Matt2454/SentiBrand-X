import type { MockTweet } from "./mock";

type XquikRecord = Record<string, unknown>;

export type XquikImportOptions = {
  brand: string;
  fallbackCreatedAt?: string;
};

const TEXT_KEYS = ["text", "full_text", "tweet_text", "content"];
const DATE_KEYS = ["createdAt", "created_at", "date", "timestamp"];
const AUTHOR_KEYS = ["author", "username", "user", "screen_name"];
const LANG_KEYS = ["lang", "language"];

export function convertXquikRecords(
  records: XquikRecord[],
  options: XquikImportOptions,
): MockTweet[] {
  return records
    .map((record, index) => toMockTweet(record, index, options))
    .filter((tweet): tweet is MockTweet => tweet !== null);
}

export function readXquikJsonPayload(payload: unknown): XquikRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (isRecord(payload)) {
    for (const key of ["tweets", "data", "items"]) {
      const value = payload[key];
      if (Array.isArray(value)) {
        return value.filter(isRecord);
      }
    }
    return [payload];
  }

  return [];
}

function toMockTweet(
  record: XquikRecord,
  index: number,
  options: XquikImportOptions,
): MockTweet | null {
  const text = firstString(record, TEXT_KEYS);
  if (!text) {
    return null;
  }

  return {
    id: firstString(record, ["id", "tweet_id", "tweetId"]) || `xquik-${index + 1}`,
    brand: firstString(record, ["brand"]) || options.brand,
    author: normalizeHandle(firstAuthor(record)),
    text,
    createdAt: firstString(record, DATE_KEYS) || options.fallbackCreatedAt || new Date(0).toISOString(),
    lang: firstString(record, LANG_KEYS) || "und",
    source: "x",
  };
}

function firstAuthor(record: XquikRecord): string {
  const author = record.author;
  if (isRecord(author)) {
    return firstString(author, ["username", "screen_name", "name"]);
  }
  return firstString(record, AUTHOR_KEYS);
}

function firstString(record: XquikRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return "";
}

function normalizeHandle(value: string): string {
  if (!value) {
    return "@unknown";
  }
  return value.startsWith("@") ? value : `@${value}`;
}

function isRecord(value: unknown): value is XquikRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
