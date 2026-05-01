import { createClient } from "@supabase/supabase-js";
import { SentimentChart } from "../components/SentimentChart";
import {
  BarChart3,
  GitCompare,
  Filter,
  LayoutDashboard,
  MessageSquareText,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";

type RecentTweet = {
  id: string;
  brand: string;
  author_handle: string;
  raw_text: string;
  posted_at: string;
};

type DashboardStats = {
  totalMentions: number;
  averageSentiment: string;
  topBrand: string;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  recentTweets: RecentTweet[];
  brandOptions: string[];
  comparison: {
    left: BrandComparisonStats | null;
    right: BrandComparisonStats | null;
  };
  hasDataSource: boolean;
};

type BrandComparisonStats = {
  brand: string;
  totalMentions: number;
  averageSentiment: string;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
};

function computeSentimentSummary(analyses: { sentiment_label: string }[]) {
  const numericSentiment = analyses.map((analysis) => {
    if (analysis.sentiment_label === "positive") {
      return 1;
    }
    if (analysis.sentiment_label === "negative") {
      return -1;
    }
    return 0;
  });

  const avgScore =
    numericSentiment.length > 0
      ? numericSentiment.reduce((sum, score) => sum + score, 0) /
        numericSentiment.length
      : 0;

  const averageSentiment =
    analyses.length === 0
      ? "N/A"
      : avgScore > 0.2
        ? "Positive"
        : avgScore < -0.2
          ? "Negative"
          : "Neutral";

  const sentimentBreakdown = analyses.reduce(
    (acc, analysis) => {
      if (analysis.sentiment_label === "positive") {
        acc.positive += 1;
      } else if (analysis.sentiment_label === "negative") {
        acc.negative += 1;
      } else {
        acc.neutral += 1;
      }

      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 },
  );

  return { averageSentiment, sentimentBreakdown };
}

async function getBrandComparisonStats(
  supabase: ReturnType<typeof createClient>,
  brand: string,
): Promise<BrandComparisonStats | null> {
  const normalized = brand.trim();

  if (!normalized) {
    return null;
  }

  const mentionsRes = await supabase
    .from("brand_mentions")
    .select("id")
    .ilike("brand", normalized);

  if (mentionsRes.error) {
    return null;
  }

  const mentionIds = (mentionsRes.data ?? []).map((item) => item.id);
  let analyses: { sentiment_label: string }[] = [];

  if (mentionIds.length > 0) {
    const analysesRes = await supabase
      .from("sentiment_analyses")
      .select("sentiment_label")
      .in("mention_id", mentionIds);

    if (analysesRes.error) {
      return null;
    }

    analyses = analysesRes.data ?? [];
  }

  const { averageSentiment, sentimentBreakdown } = computeSentimentSummary(
    analyses,
  );

  return {
    brand: normalized,
    totalMentions: mentionIds.length,
    averageSentiment,
    sentimentBreakdown,
  };
}

async function getDashboardStats(searchTerm: string): Promise<DashboardStats> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      totalMentions: 0,
      averageSentiment: "N/A",
      topBrand: "N/A",
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      recentTweets: [],
      brandOptions: [],
      comparison: { left: null, right: null },
      hasDataSource: false,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const normalizedSearch = searchTerm.trim();
  const hasBrandFilter = normalizedSearch.length > 0;

  const baseMentionsCountQuery = supabase
    .from("brand_mentions")
    .select("id", { count: "exact", head: true });
  const baseMentionsRecentQuery = supabase
    .from("brand_mentions")
    .select("id, brand, author_handle, raw_text, posted_at")
    .order("posted_at", { ascending: false })
    .limit(8);
  const baseMentionsAllQuery = supabase.from("brand_mentions").select("id, brand");

  const mentionsCountQuery = hasBrandFilter
    ? baseMentionsCountQuery.ilike("brand", `%${normalizedSearch}%`)
    : baseMentionsCountQuery;
  const recentMentionsQuery = hasBrandFilter
    ? baseMentionsRecentQuery.ilike("brand", `%${normalizedSearch}%`)
    : baseMentionsRecentQuery;
  const allMentionsQuery = hasBrandFilter
    ? baseMentionsAllQuery.ilike("brand", `%${normalizedSearch}%`)
    : baseMentionsAllQuery;

  const [{ count }, recentMentionsRes, allMentionsRes] = await Promise.all([
    mentionsCountQuery,
    recentMentionsQuery,
    allMentionsQuery,
  ]);

  if (recentMentionsRes.error || allMentionsRes.error) {
    return {
      totalMentions: count ?? 0,
      averageSentiment: "N/A",
      topBrand: "N/A",
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      recentTweets: [],
      brandOptions: [],
      comparison: { left: null, right: null },
      hasDataSource: true,
    };
  }

  const mentions = recentMentionsRes.data ?? [];
  const allMentions = allMentionsRes.data ?? [];
  const mentionIds = allMentions.map((mention) => mention.id);

  let analyses: { sentiment_label: string }[] = [];

  if (mentionIds.length > 0) {
    const analysesRes = await supabase
      .from("sentiment_analyses")
      .select("sentiment_label")
      .in("mention_id", mentionIds);

    if (analysesRes.error) {
      return {
        totalMentions: count ?? 0,
        averageSentiment: "N/A",
        topBrand: "N/A",
        sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
        recentTweets: mentions,
        brandOptions: [],
        comparison: { left: null, right: null },
        hasDataSource: true,
      };
    }

    analyses = analysesRes.data ?? [];
  }

  const brandCounts = allMentions.reduce<Record<string, number>>(
    (acc, mention) => {
      acc[mention.brand] = (acc[mention.brand] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const topBrandEntry = Object.entries(brandCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];

  const { averageSentiment, sentimentBreakdown } = computeSentimentSummary(
    analyses,
  );
  const brandOptions = Array.from(new Set(allMentions.map((m) => m.brand))).sort(
    (a, b) => a.localeCompare(b),
  );

  return {
    totalMentions: count ?? 0,
    averageSentiment,
    topBrand: topBrandEntry?.[0] ?? "N/A",
    sentimentBreakdown,
    recentTweets: mentions,
    brandOptions,
    comparison: { left: null, right: null },
    hasDataSource: true,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; brandA?: string; brandB?: string }>;
}) {
  const { brand, brandA, brandB } = await searchParams;
  const searchTerm = brand?.trim() ?? "";
  const stats = await getDashboardStats(searchTerm);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let comparison = stats.comparison;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const [left, right] = await Promise.all([
      getBrandComparisonStats(supabase, brandA ?? ""),
      getBrandComparisonStats(supabase, brandB ?? ""),
    ]);
    comparison = { left, right };
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-zinc-200 bg-white lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="space-y-8 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Sentibrand
              </p>
              <h1 className="mt-2 text-xl font-semibold text-zinc-900">
                Dashboard
              </h1>
            </div>

            <nav className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600">
                <MessageSquareText className="h-4 w-4" />
                Mentions
              </div>
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600">
                <Search className="h-4 w-4" />
                Brand Search
              </div>
            </nav>
          </div>
        </aside>

        <section className="flex-1 space-y-6 p-4 sm:p-6">
          <header className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">Phase 03 · Tasks 3.1 + 3.3</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-900">
              Brand sentiment command center
            </h2>
            <form className="mt-4 flex w-full flex-col gap-2 sm:max-w-md sm:flex-row">
              <label className="sr-only" htmlFor="brand-search">
                Search brand
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  id="brand-search"
                  name="brand"
                  defaultValue={searchTerm}
                  placeholder="Filter by brand (e.g. Apple)"
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 outline-none ring-emerald-500/30 transition focus:ring-4"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                <Filter className="h-4 w-4" />
                Filter
              </button>
            </form>
            {searchTerm ? (
              <p className="mt-2 text-sm text-zinc-500">
                Showing results for brand filter:{" "}
                <span className="font-medium text-zinc-800">{searchTerm}</span>
              </p>
            ) : null}
          </header>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-zinc-600" />
              <h3 className="text-lg font-semibold text-zinc-900">
                Brand Comparison
              </h3>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Compare two brands side by side with autocomplete suggestions.
            </p>
            <form className="mt-4 grid gap-3 md:grid-cols-3">
              <input type="hidden" name="brand" value={searchTerm} />
              <div>
                <label
                  htmlFor="brand-a"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
                >
                  Brand A
                </label>
                <input
                  id="brand-a"
                  name="brandA"
                  list="brand-options"
                  defaultValue={brandA ?? ""}
                  placeholder="Type first brand"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4"
                />
              </div>
              <div>
                <label
                  htmlFor="brand-b"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
                >
                  Brand B
                </label>
                <input
                  id="brand-b"
                  name="brandB"
                  list="brand-options"
                  defaultValue={brandB ?? ""}
                  placeholder="Type second brand"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare Brands
                </button>
              </div>
              <datalist id="brand-options">
                {stats.brandOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </form>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[comparison.left, comparison.right].map((item, index) => (
                <article
                  key={item?.brand ?? `placeholder-${index}`}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  {item ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-zinc-900">
                          {item.brand}
                        </h4>
                        <span className="text-xs text-zinc-500">
                          {item.totalMentions} mentions
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-600">
                        Average sentiment:{" "}
                        <span className="font-medium text-zinc-900">
                          {item.averageSentiment}
                        </span>
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                          + {item.sentimentBreakdown.positive}
                        </div>
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                          = {item.sentimentBreakdown.neutral}
                        </div>
                        <div className="rounded-lg bg-rose-50 p-2 text-rose-700">
                          - {item.sentimentBreakdown.negative}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Select a brand to start comparison.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-zinc-900">Statistiche</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500">Total Mentions</p>
                  <MessageSquareText className="h-4 w-4 text-zinc-500" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-zinc-900">
                  {stats.totalMentions}
                </p>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500">Average Sentiment</p>
                  <Sparkles className="h-4 w-4 text-zinc-500" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-zinc-900">
                  {stats.averageSentiment}
                </p>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500">Top Brand</p>
                  <Trophy className="h-4 w-4 text-zinc-500" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-zinc-900">
                  {stats.topBrand}
                </p>
              </article>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <SentimentChart
              positive={stats.sentimentBreakdown.positive}
              neutral={stats.sentimentBreakdown.neutral}
              negative={stats.sentimentBreakdown.negative}
            />

            <section className="rounded-2xl border border-zinc-200 bg-white lg:col-span-2">
              <div className="border-b border-zinc-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-zinc-900">
                  Recent Tweets
                </h3>
                <p className="text-sm text-zinc-500">
                  Latest mentions ingested from your Supabase database.
                </p>
              </div>

              {!stats.hasDataSource ? (
                <div className="px-5 py-8 text-sm text-zinc-600">
                  Configure `NEXT_PUBLIC_SUPABASE_URL` and
                  `NEXT_PUBLIC_SUPABASE_ANON_KEY` to load live data.
                </div>
              ) : stats.recentTweets.length === 0 ? (
                <div className="px-5 py-8 text-sm text-zinc-600">
                  No mentions found yet. Run `npm run process:mentions` to
                  ingest and analyze mock tweets.
                </div>
              ) : (
                <ul className="divide-y divide-zinc-200">
                  {stats.recentTweets.map((tweet) => (
                    <li key={tweet.id} className="space-y-2 px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span className="rounded-full bg-zinc-100 px-2 py-1 font-medium text-zinc-700">
                          {tweet.brand}
                        </span>
                        <span>{tweet.author_handle}</span>
                        <span>•</span>
                        <span>{new Date(tweet.posted_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm leading-6 text-zinc-800">
                        {tweet.raw_text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
