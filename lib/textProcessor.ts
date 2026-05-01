const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const MENTION_PATTERN = /(^|\s)@[a-z0-9_]+/gi;
const HASHTAG_PATTERN = /(^|\s)#[a-z0-9_]+/gi;
const MULTI_SPACE_PATTERN = /\s+/g;

export function cleanTweetText(text: string): string {
  return text
    .replace(URL_PATTERN, " ")
    .replace(MENTION_PATTERN, " ")
    .replace(HASHTAG_PATTERN, " ")
    .replace(MULTI_SPACE_PATTERN, " ")
    .trim();
}
