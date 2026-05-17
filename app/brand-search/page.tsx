"use client";

import { useState, useEffect } from "react";
import { Search, GitCompare, TrendingUp, TrendingDown, Minus, LayoutDashboard, BarChart3, MessageSquareText } from "lucide-react";
import { ThemeToggle } from "../../components/theme-toggle";
import { LiveMentionsStatus } from "../../components/LiveMentionsStatus";
import Link from "next/link";
import { calculateInfluenceScore, calculateWeightedSentiment, detectCrisisAlerts } from "../../lib/influenceCalculator";
import type { BrandMention, SentimentAnalysis } from "../../types/dashboard";
import { createSupabaseClient } from "../../lib/supabase";

interface BrandComparison {
  brand: string;
  mentions: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  avgSentiment: number;
  weightedSentiment: number;
  influenceScore: number;
  crisisAlerts: number;
  trendingCount: number;
  topMentions: Array<{
    mention: BrandMention;
    influence: ReturnType<typeof calculateInfluenceScore>;
  }>;
}

interface BrandSearchState {
  brandA: string;
  brandB: string;
  loading: boolean;
  comparisonA: BrandComparison | null;
  comparisonB: BrandComparison | null;
  availableBrands: string[];
  searchingA: boolean;
  searchingB: boolean;
}

export default function BrandSearchPage() {
  const [state, setState] = useState<BrandSearchState>({
    brandA: "",
    brandB: "",
    loading: false,
    comparisonA: null,
    comparisonB: null,
    availableBrands: [],
    searchingA: false,
    searchingB: false,
  });

  // Fetch available brands on mount
  useEffect(() => {
    async function fetchBrands() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) return;

      const supabase = createSupabaseClient();

      const { data, error } = await supabase
        .from("brand_mentions")
        .select("brand")
        .order("brand");

      if (error) {
        console.error("Error fetching brands:", error);
        return;
      }

      const brands = [...new Set((data || []).map(m => m.brand))].sort();
      setState(prev => ({ ...prev, availableBrands: brands }));
    }

    fetchBrands();
  }, []);

  // Analyze brand
  const analyzeBrand = async (brandName: string, side: 'A' | 'B') => {
    if (!brandName.trim()) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) return;

    setState(prev => ({ 
      ...prev, 
      [`searching${side}`]: true,
      [`comparison${side}`]: null 
    }));

    const supabase = createSupabaseClient();

    try {
      // Get mentions for this brand
      const { data: mentions, error: mentionsError } = await supabase
        .from("brand_mentions")
        .select("*")
        .ilike("brand", `%${brandName.trim()}%`)
        .order("posted_at", { ascending: false })
        .limit(100);

      if (mentionsError || !mentions) {
        console.error("Error fetching mentions:", mentionsError);
        setState(prev => ({ ...prev, [`searching${side}`]: false }));
        return;
      }

      // Get sentiment analyses
      const mentionIds = mentions.map(m => m.id);
      const { data: analyses, error: analysesError } = await supabase
        .from("sentiment_analyses")
        .select("*")
        .in("mention_id", mentionIds);

      if (analysesError) {
        console.error("Error fetching analyses:", analysesError);
        setState(prev => ({ ...prev, [`searching${side}`]: false }));
        return;
      }

      // Calculate metrics
      const sentimentBreakdown = analyses?.reduce((acc, analysis) => {
        acc[analysis.sentiment_label]++;
        return acc;
      }, { positive: 0, neutral: 0, negative: 0 }) || { positive: 0, neutral: 0, negative: 0 };

      const totalAnalyses = analyses?.length || 0;
      const avgSentiment = totalAnalyses > 0 ? (sentimentBreakdown.positive / totalAnalyses) * 100 : 0;
      const weightedSentiment = calculateWeightedSentiment(mentions, "positive") - 
                              calculateWeightedSentiment(mentions, "negative");

      // Calculate influence scores
      const influenceScores = mentions.map(m => calculateInfluenceScore(m));
      const totalInfluence = influenceScores.reduce((sum, score) => sum + score.weightedScore, 0);

      // Detect crisis alerts
      const crisisDetection = detectCrisisAlerts(mentions);
      const trendingCount = mentions.filter(m => {
        const influence = calculateInfluenceScore(m);
        return influence.engagementRatio > 0.05 || influence.impactLevel === "viral";
      }).length;

      // Get top mentions by influence
      const topMentions = mentions
        .map(mention => ({
          mention,
          influence: calculateInfluenceScore(mention)
        }))
        .sort((a, b) => b.influence.weightedScore - a.influence.weightedScore)
        .slice(0, 5);

      const comparison: BrandComparison = {
        brand: brandName,
        mentions: mentions.length,
        sentimentBreakdown,
        avgSentiment: Math.round(avgSentiment * 100) / 100,
        weightedSentiment: Math.round(weightedSentiment * 100) / 100,
        influenceScore: Math.round(totalInfluence * 100) / 100,
        crisisAlerts: crisisDetection.alerts.length,
        trendingCount,
        topMentions,
      };

      setState(prev => ({ 
        ...prev, 
        [`comparison${side}`]: comparison,
        [`searching${side}`]: false 
      }));
    } catch (error) {
      console.error("Error analyzing brand:", error);
      setState(prev => ({ ...prev, [`searching${side}`]: false }));
    }
  };

  const handleSearch = (side: 'A' | 'B') => {
    const brandName = side === 'A' ? state.brandA : state.brandB;
    analyzeBrand(brandName, side);
  };

  const getSentimentIcon = (score: number) => {
    if (score > 10) return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (score < -10) return <TrendingDown className="h-4 w-4 text-rose-600" />;
    return <Minus className="h-4 w-4 text-zinc-600" />;
  };

  const getSentimentColor = (score: number) => {
    if (score > 10) return "text-emerald-600";
    if (score < -10) return "text-rose-600";
    return "text-zinc-600";
  };

  const renderComparisonCard = (comparison: BrandComparison | null, side: 'A' | 'B') => {
    const isLoading = side === 'A' ? state.searchingA : state.searchingB;
    const brandName = side === 'A' ? state.brandA : state.brandB;

    if (isLoading) {
      return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-center h-64">
            <div className="text-zinc-500 dark:text-zinc-400">Analyzing {brandName}...</div>
          </div>
        </div>
      );
    }

    if (!comparison) {
      return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center">
            <GitCompare className="mx-auto h-12 w-12 text-zinc-400 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Brand {side}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Enter a brand name to see detailed analysis
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            {comparison.brand}
          </h3>
          <div className="flex items-center gap-2">
            {getSentimentIcon(comparison.weightedSentiment)}
            <span className={`text-lg font-medium ${getSentimentColor(comparison.weightedSentiment)}`}>
              {comparison.weightedSentiment > 0 ? "+" : ""}{comparison.weightedSentiment}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Weighted Sentiment</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Mentions</p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {comparison.mentions.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Avg Sentiment</p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {comparison.avgSentiment}%
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Sentiment Breakdown</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-600">Positive</span>
                <span className="text-sm font-medium">{comparison.sentimentBreakdown.positive}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600">Neutral</span>
                <span className="text-sm font-medium">{comparison.sentimentBreakdown.neutral}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-rose-600">Negative</span>
                <span className="text-sm font-medium">{comparison.sentimentBreakdown.negative}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Influence Score</p>
              <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {comparison.influenceScore.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Trending</p>
              <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {comparison.trendingCount}
              </p>
            </div>
          </div>

          {comparison.crisisAlerts > 0 && (
            <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-900/30">
              <p className="text-sm font-medium text-rose-900 dark:text-rose-100">
                ⚠️ {comparison.crisisAlerts} Crisis Alert{comparison.crisisAlerts > 1 ? 's' : ''}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Top Mentions</p>
            <div className="space-y-2">
              {comparison.topMentions.slice(0, 3).map(({ mention, influence }) => (
                <div key={mention.id} className="text-xs p-2 rounded bg-zinc-50 dark:bg-zinc-800/50">
                  <p className="line-clamp-2 text-zinc-700 dark:text-zinc-300">
                    {mention.raw_text}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-zinc-500">@{mention.author_handle}</span>
                    <span className="text-zinc-500">Score: {influence.weightedScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
                Brand Search
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
              <Link href="/mentions" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <MessageSquareText className="h-4 w-4" />
                Mentions
              </Link>
              <Link href="/brand-search" className="flex items-center gap-3 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
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
                  Il Confronto · Brand Intelligence Comparison
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Side-by-Side Brand Analysis
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <LiveMentionsStatus />
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Search Inputs */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Compare Brands
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Brand A
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter first brand (e.g., Apple)"
                    value={state.brandA}
                    onChange={(e) => setState(prev => ({ ...prev, brandA: e.target.value }))}
                    className="flex-1 rounded-xl border border-zinc-200 bg-white py-2 px-3 text-sm text-zinc-900 outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    list={`brands-${'A'}`}
                  />
                  <datalist id={`brands-${'A'}`}>
                    {state.availableBrands.map(brand => (
                      <option key={brand} value={brand} />
                    ))}
                  </datalist>
                  <button
                    onClick={() => handleSearch('A')}
                    disabled={!state.brandA.trim() || state.searchingA}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {state.searchingA ? 'Analyzing...' : 'Analyze'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Brand B
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter second brand (e.g., Samsung)"
                    value={state.brandB}
                    onChange={(e) => setState(prev => ({ ...prev, brandB: e.target.value }))}
                    className="flex-1 rounded-xl border border-zinc-200 bg-white py-2 px-3 text-sm text-zinc-900 outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    list={`brands-${'B'}`}
                  />
                  <datalist id={`brands-${'B'}`}>
                    {state.availableBrands.map(brand => (
                      <option key={brand} value={brand} />
                    ))}
                  </datalist>
                  <button
                    onClick={() => handleSearch('B')}
                    disabled={!state.brandB.trim() || state.searchingB}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {state.searchingB ? 'Analyzing...' : 'Analyze'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Results */}
          <div className="grid gap-6 lg:grid-cols-2">
            {renderComparisonCard(state.comparisonA, 'A')}
            {renderComparisonCard(state.comparisonB, 'B')}
          </div>

          {/* VS Comparison */}
          {state.comparisonA && state.comparisonB && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Head-to-Head Comparison
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {state.comparisonA.brand}
                    </span>
                    <span className="text-sm text-zinc-600">
                      {state.comparisonA.mentions} mentions
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {state.comparisonB.brand}
                    </span>
                    <span className="text-sm text-zinc-600">
                      {state.comparisonB.mentions} mentions
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Sentiment Winner
                    </span>
                    <span className={`text-sm font-medium ${
                      state.comparisonA.weightedSentiment > state.comparisonB.weightedSentiment
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}>
                      {state.comparisonA.weightedSentiment > state.comparisonB.weightedSentiment
                        ? state.comparisonA.brand
                        : state.comparisonB.brand}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Influence Winner
                    </span>
                    <span className={`text-sm font-medium ${
                      state.comparisonA.influenceScore > state.comparisonB.influenceScore
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}>
                      {state.comparisonA.influenceScore > state.comparisonB.influenceScore
                        ? state.comparisonA.brand
                        : state.comparisonB.brand}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
