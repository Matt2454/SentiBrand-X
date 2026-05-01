import { createClient } from "@supabase/supabase-js";
import type { 
  RealtimeSnapshot, 
  BrandMention, 
  SentimentBreakdown,
  SupabaseConfig 
} from "../types/dashboard";

function toAverageSentiment(
  positive: number,
  neutral: number,
  negative: number,
): RealtimeSnapshot["averageSentiment"] {
  const total = positive + neutral + negative;
  if (total === 0) {
    return "N/A";
  }

  const score = (positive - negative) / total;
  if (score > 0.2) {
    return "Positive";
  }
  if (score < -0.2) {
    return "Negative";
  }
  return "Neutral";
}

function createEmptySnapshot(): RealtimeSnapshot {
  return {
    totalMentions: 0,
    totalAnalyzed: 0,
    averageSentiment: "N/A",
    sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
    recentTweets: [],
    lastUpdate: null,
  };
}

function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    return null;
  }
  
  return { url, anonKey };
}

export async function fetchRealtimeSnapshot(
  brandFilter?: string,
): Promise<RealtimeSnapshot> {
  const config = getSupabaseConfig();
  
  if (!config) {
    return createEmptySnapshot();
  }

  const supabase = createClient(config.url, config.anonKey);
  const normalized = brandFilter?.trim();

  try {
    // Extend temporal range to 30 days to include all seeded data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build base queries with brand filtering
    let mentionsQuery = supabase
      .from("brand_mentions")
      .select("id, brand")
      .gte("posted_at", thirtyDaysAgo.toISOString());

    let recentQuery = supabase
      .from("brand_mentions")
      .select("id, brand, author_handle, raw_text, posted_at")
      .order("posted_at", { ascending: false })
      .limit(6)
      .gte("posted_at", thirtyDaysAgo.toISOString());

    // Apply brand filter if specified
    if (normalized && normalized.length > 0) {
      mentionsQuery = mentionsQuery.eq("brand", normalized);
      recentQuery = recentQuery.eq("brand", normalized);
    }

    const [mentionsRes, recentRes] = await Promise.all([
      mentionsQuery,
      recentQuery
    ]);

    if (mentionsRes.error || recentRes.error) {
      console.error("Supabase query error:", { mentionsRes, recentRes });
      return createEmptySnapshot();
    }

    const mentions = mentionsRes.data ?? [];
    const mentionIds = mentions.map((item) => item.id);

    let analyses: { sentiment_label: string; created_at: string }[] = [];
    if (mentionIds.length > 0) {
      const analysesRes = await supabase
        .from("sentiment_analyses")
        .select("sentiment_label, created_at")
        .in("mention_id", mentionIds);

      if (!analysesRes.error) {
        analyses = analysesRes.data ?? [];
      }
    }

    const sentimentBreakdown: SentimentBreakdown = analyses.reduce(
      (acc: SentimentBreakdown, row) => {
        if (row.sentiment_label === "positive") {
          acc.positive += 1;
        } else if (row.sentiment_label === "negative") {
          acc.negative += 1;
        } else {
          acc.neutral += 1;
        }
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );

    const lastUpdate = analyses
      .map((row) => row.created_at)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      totalMentions: mentions.length,
      totalAnalyzed: analyses.length,
      averageSentiment: toAverageSentiment(
        sentimentBreakdown.positive,
        sentimentBreakdown.neutral,
        sentimentBreakdown.negative,
      ),
      sentimentBreakdown,
      recentTweets: (recentRes.data ?? []) as BrandMention[],
      lastUpdate: lastUpdate ?? null,
    };
  } catch (error) {
    console.error("Error fetching realtime snapshot:", error);
    return createEmptySnapshot();
  }
}
