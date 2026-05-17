"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { MessageSquareText, Search, Filter, TrendingUp, AlertTriangle, LayoutDashboard, BarChart3 } from "lucide-react";
import { ThemeToggle } from "../../components/theme-toggle";
import { LiveMentionsStatus } from "../../components/LiveMentionsStatus";
import Link from "next/link";
import { calculateInfluenceScore, getTrendingMentions } from "../../lib/influenceCalculator";
import type { BrandMention, SentimentAnalysis } from "../../types/dashboard";

interface MentionWithAnalysis extends BrandMention {
  sentiment?: "positive" | "neutral" | "negative";
  confidence?: number;
  influence?: ReturnType<typeof calculateInfluenceScore>;
  isTrending?: boolean;
}

interface MentionsPageState {
  mentions: MentionWithAnalysis[];
  loading: boolean;
  searchTerm: string;
  sentimentFilter: "all" | "positive" | "neutral" | "negative";
  currentPage: number;
  itemsPerPage: number;
  totalCount: number;
  trendingCount: number;
  crisisAlerts: number;
}

const ITEMS_PER_PAGE = 20;

export default function MentionsPage() {
  const [state, setState] = useState<MentionsPageState>({
    mentions: [],
    loading: true,
    searchTerm: "",
    sentimentFilter: "all",
    currentPage: 1,
    itemsPerPage: ITEMS_PER_PAGE,
    totalCount: 0,
    trendingCount: 0,
    crisisAlerts: 0,
  });

  // Fetch mentions and analyses
  useEffect(() => {
    async function fetchMentions() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      try {
        // Get mentions with pagination
        const { data: mentions, error: mentionsError, count } = await supabase
          .from("brand_mentions")
          .select("*", { count: "exact" })
          .order("posted_at", { ascending: false })
          .range((state.currentPage - 1) * state.itemsPerPage, state.currentPage * state.itemsPerPage - 1);

        if (mentionsError || !mentions) {
          console.error("Error fetching mentions:", mentionsError);
          setState(prev => ({ ...prev, loading: false }));
          return;
        }

        // Get sentiment analyses for these mentions
        const mentionIds = mentions.map(m => m.id);
        const { data: analyses, error: analysesError } = await supabase
          .from("sentiment_analyses")
          .select("*")
          .in("mention_id", mentionIds);

        if (analysesError) {
          console.error("Error fetching analyses:", analysesError);
        }

        // Combine mentions with analyses and calculate influence
        const mentionsWithAnalysis: MentionWithAnalysis[] = mentions.map(mention => {
          const analysis = analyses?.find(a => a.mention_id === mention.id);
          const influence = calculateInfluenceScore(mention);
          const trendingMentions = getTrendingMentions(mentions, 10);
          const isTrending = trendingMentions.some(tm => tm.mention.id === mention.id);

          return {
            ...mention,
            sentiment: analysis?.sentiment_label,
            confidence: analysis?.confidence,
            influence,
            isTrending,
          };
        });

        // Calculate metrics
        const trendingCount = mentionsWithAnalysis.filter(m => m.isTrending).length;
        const crisisAlerts = mentionsWithAnalysis.filter(m => 
          m.sentiment === "negative" && m.influence?.impactLevel === "viral"
        ).length;

        setState(prev => ({
          ...prev,
          mentions: mentionsWithAnalysis,
          loading: false,
          totalCount: count || 0,
          trendingCount,
          crisisAlerts,
        }));
      } catch (error) {
        console.error("Error in fetchMentions:", error);
        setState(prev => ({ ...prev, loading: false }));
      }
    }

    fetchMentions();
  }, [state.currentPage]);

  // Filter mentions based on search and sentiment
  const filteredMentions = useMemo(() => {
    return state.mentions.filter(mention => {
      const matchesSearch = state.searchTerm === "" || 
        mention.brand.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        mention.raw_text.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        mention.author_handle.toLowerCase().includes(state.searchTerm.toLowerCase());

      const matchesSentiment = state.sentimentFilter === "all" || 
        mention.sentiment === state.sentimentFilter;

      return matchesSearch && matchesSentiment;
    });
  }, [state.mentions, state.searchTerm, state.sentimentFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredMentions.length / state.itemsPerPage);
  const paginatedMentions = filteredMentions.slice(
    (state.currentPage - 1) * state.itemsPerPage,
    state.currentPage * state.itemsPerPage
  );

  const handleSearch = (value: string) => {
    setState(prev => ({ ...prev, searchTerm: value, currentPage: 1 }));
  };

  const handleSentimentFilter = (filter: typeof state.sentimentFilter) => {
    setState(prev => ({ ...prev, sentimentFilter: filter, currentPage: 1 }));
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive": return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30";
      case "negative": return "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/30";
      case "neutral": return "text-zinc-600 bg-zinc-50 dark:text-zinc-400 dark:bg-zinc-900/30";
      default: return "text-zinc-500 bg-zinc-50 dark:text-zinc-400 dark:bg-zinc-900/30";
    }
  };

  const getImpactBadge = (influence?: ReturnType<typeof calculateInfluenceScore>) => {
    if (!influence) return null;

    const colors = {
      viral: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      high: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      low: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
    };

    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colors[influence.impactLevel]}`}>
        {influence.impactLevel === "viral" && "🔥 "}
        {influence.impactLevel.charAt(0).toUpperCase() + influence.impactLevel.slice(1)} Impact
      </span>
    );
  };

  if (state.loading) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500 dark:text-zinc-400">Loading mentions...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row">
        {/* Sidebar Navigation */}
        <aside className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="space-y-8 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Sentibrand
              </p>
              <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Mentions
              </h1>
            </div>

            <nav className="space-y-2">
              <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </Link>
              <Link href="/analytics" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Link>
              <Link href="/mentions" className="flex items-center gap-3 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
                <MessageSquareText className="h-4 w-4" />
                Mentions
              </Link>
              <Link href="/brand-search" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Search className="h-4 w-4" />
                Brand Search
              </Link>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <section className="flex-1 space-y-6 p-4 sm:p-6">
          {/* Header */}
          <header className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  L'Archivio · Complete Mention Archive
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Brand Intelligence Archive
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <LiveMentionsStatus />
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Mentions</p>
                <MessageSquareText className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {state.totalCount.toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Trending</p>
                <TrendingUp className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {state.trendingCount}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Crisis Alerts</p>
                <AlertTriangle className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {state.crisisAlerts}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Filtered Results</p>
                <Filter className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {filteredMentions.length}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by brand, text, or author..."
                  value={state.searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSentimentFilter("all")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    state.sentimentFilter === "all"
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleSentimentFilter("positive")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    state.sentimentFilter === "positive"
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  Positive
                </button>
                <button
                  onClick={() => handleSentimentFilter("neutral")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    state.sentimentFilter === "neutral"
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  Neutral
                </button>
                <button
                  onClick={() => handleSentimentFilter("negative")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    state.sentimentFilter === "negative"
                      ? "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  Negative
                </button>
              </div>
            </div>
          </div>

          {/* Mentions Table */}
          <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">Mention</th>
                    <th className="text-left py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">Brand</th>
                    <th className="text-left py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">Author</th>
                    <th className="text-center py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">Sentiment</th>
                    <th className="text-center py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">Impact</th>
                    <th className="text-left py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMentions.map((mention, index) => (
                    <tr 
                      key={mention.id} 
                      className={`border-b border-zinc-100 dark:border-zinc-800 ${
                        index % 2 === 0 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""
                      } ${mention.isTrending ? "ring-2 ring-purple-500/20" : ""}`}
                    >
                      <td className="py-4 px-4">
                        <div className="max-w-md">
                          <p className="text-zinc-900 dark:text-zinc-100 line-clamp-2">
                            {mention.raw_text}
                          </p>
                          {mention.isTrending && (
                            <span className="mt-1 inline-flex items-center text-xs text-purple-600 dark:text-purple-400">
                              🔥 Trending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {mention.brand}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            @{mention.author_handle}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {mention.author_followers?.toLocaleString() || 0} followers
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {mention.sentiment && (
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getSentimentColor(mention.sentiment)}`}>
                            {mention.sentiment.charAt(0).toUpperCase() + mention.sentiment.slice(1)}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {getImpactBadge(mention.influence)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>❤️ {mention.likes || 0}</span>
                          <span>🔄 {mention.retweets || 0}</span>
                          <span>💬 {mention.replies || 0}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Showing {((state.currentPage - 1) * state.itemsPerPage) + 1} to{" "}
                    {Math.min(state.currentPage * state.itemsPerPage, filteredMentions.length)} of{" "}
                    {filteredMentions.length} results
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(state.currentPage - 1)}
                      disabled={state.currentPage === 1}
                      className="rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (state.currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (state.currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = state.currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                              pageNum === state.currentPage
                                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
                                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => handlePageChange(state.currentPage + 1)}
                      disabled={state.currentPage === totalPages}
                      className="rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
