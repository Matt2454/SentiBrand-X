import { config } from "dotenv";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

config({ path: path.resolve(process.cwd(), ".env.local") });

import type { MockTweet } from "../lib/mock";
import { analyzeSentiment } from "../lib/sentimentService";
import { cleanTweetText } from "../lib/textProcessor";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment";
const DELAY_MS = 500;
const REALTIME_PING_URL = process.env.REALTIME_PING_URL;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toDbSentiment(label: string): "positive" | "neutral" | "negative" {
  const normalized = label.toLowerCase();

  if (normalized === "positive") {
    return "positive";
  }

  if (normalized === "negative") {
    return "negative";
  }

  return "neutral";
}

async function insertOrGetMentionId(
  supabase: SupabaseClient,
  tweet: MockTweet,
  normalizedText: string,
) {
  const insertResult = await supabase
    .from("brand_mentions")
    .insert({
      external_id: tweet.id,
      brand: tweet.brand,
      author_handle: tweet.authorHandle,
      author_followers: tweet.authorFollowers,
      source: tweet.source,
      raw_text: tweet.text,
      normalized_text: normalizedText,
      language_code: tweet.lang,
      posted_at: tweet.createdAt,
      likes: tweet.likes,
      retweets: tweet.retweets,
      replies: tweet.replies,
    })
    .select("id")
    .single();

  if (!insertResult.error) {
    return insertResult.data.id;
  }

  // If already ingested, reuse existing mention id.
  if (insertResult.error.code === "23505") {
    const existing = await supabase
      .from("brand_mentions")
      .select("id")
      .eq("external_id", tweet.id)
      .single();

    if (existing.error) {
      throw new Error(
        `Failed to resolve existing mention for ${tweet.id}: ${existing.error.message}`,
      );
    }

    return existing.data.id;
  }

  throw new Error(
    `Failed to insert brand mention ${tweet.id}: ${insertResult.error.message}`,
  );
}

async function run() {
  const { supabase } = await import("../lib/supabase");
  const mockDataPath = path.resolve(__dirname, "../data/mockData.json");
  const raw = await readFile(mockDataPath, "utf8");
  const tweets = JSON.parse(raw) as MockTweet[];

  process.stdout.write(`Processing ${tweets.length} mentions...\n`);

  for (const tweet of tweets) {
    const cleanedText = cleanTweetText(tweet.text);
    const sentiment = await analyzeSentiment(cleanedText);
    const mentionId = await insertOrGetMentionId(supabase, tweet, cleanedText);

    const sentimentInsert = await supabase.from("sentiment_analyses").insert({
      mention_id: mentionId,
      model_name: MODEL_NAME,
      sentiment_label: toDbSentiment(sentiment.sentiment),
      confidence: sentiment.confidence,
      latency_ms: null,
    });

    if (sentimentInsert.error) {
      throw new Error(
        `Failed to insert sentiment for mention ${tweet.id}: ${sentimentInsert.error.message}`,
      );
    }

    process.stdout.write(
      `Processed ${tweet.id} -> ${sentiment.sentiment} (${sentiment.confidence.toFixed(4)})\n`,
    );

    // Optional explicit trigger: useful if an external real-time channel is configured.
    if (REALTIME_PING_URL) {
      await fetch(REALTIME_PING_URL, { method: "POST" }).catch(() => {
        // Non-blocking on purpose: ingestion must continue even if trigger fails.
      });
    }

    await wait(DELAY_MS);
  }

  process.stdout.write("Analysis + ingestion pipeline completed.\n");
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`Pipeline failed: ${message}\n`);
  process.exit(1);
});
