import { createClient } from "@supabase/supabase-js";

type SnapshotTweet = {
  id: string;
  brand: string;
  author_handle: string;
  raw_text: string;
  posted_at: string;
};

export type RealtimeSnapshot = {
  totalMentions: number;
  totalAnalyzed: number;
  averageSentiment: "Positive" | "Neutral" | "Negative" | "N/A";
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  recentTweets: SnapshotTweet[];
  lastUpdate: string | null;
};

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

export async function fetchRealtimeSnapshot(
  brandFilter?: string,
): Promise<RealtimeSnapshot> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      totalMentions: 0,
      totalAnalyzed: 0,
      averageSentiment: "N/A",
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      recentTweets: [],
      lastUpdate: null,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const normalized = brandFilter?.trim();

  const mentionsBase = supabase.from("brand_mentions").select("id, brand");
  const mentionsQuery = normalized
    ? mentionsBase.ilike("brand", `%${normalized}%`)
    : mentionsBase;

  const recentBase = supabase
    .from("brand_mentions")
    .select("id, brand, author_handle, raw_text, posted_at")
    .order("posted_at", { ascending: false })
    .limit(6);
  const recentQuery = normalized
    ? recentBase.ilike("brand", `%${normalized}%`)
    : recentBase;

  const [mentionsRes, recentRes] = await Promise.all([mentionsQuery, recentQuery]);
  const mentions = mentionsRes.data ?? [];
  const mentionIds = mentions.map((item) => item.id);

  let analyses: { sentiment_label: string; created_at: string }[] = [];
  if (mentionIds.length > 0) {
    const analysesRes = await supabase
      .from("sentiment_analyses")
      .select("sentiment_label, created_at")
      .in("mention_id", mentionIds);
    analyses = analysesRes.data ?? [];
  }

  const sentimentBreakdown = analyses.reduce(
    (acc, row) => {
      if (row.sentiment_label === "positive") {
        acc.positive += 1;
      } else if (row.sentiment_label === "negative") {
        acc.negative += 1;
      } else {
        acc.neutral += 1;
      }
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 },
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
    recentTweets: recentRes.data ?? [],
    lastUpdate: lastUpdate ?? null,
  };
}
