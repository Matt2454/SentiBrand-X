"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { BarChart3, TrendingUp, Calendar, Download, LayoutDashboard, MessageSquareText, Search } from "lucide-react";
import { ThemeToggle } from "../../components/theme-toggle";
import { LiveMentionsStatus } from "../../components/LiveMentionsStatus";
import { BrandSelector } from "../../components/BrandSelector";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { calculateInfluenceScore, calculateWeightedSentiment } from "../../lib/influenceCalculator";
import type { BrandMention, SentimentAnalysis } from "../../types/dashboard";

interface AnalyticsData {
  dailyData: Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
    totalMentions: number;
    weightedSentiment: number;
  }>;
  topBrands: Array<{
    brand: string;
    mentions: number;
    avgSentiment: number;
    weightedSentiment: number;
  }>;
  crisisAlerts: number;
  trendingCount: number;
}

async function getAnalyticsData(brandName?: string): Promise<AnalyticsData> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      dailyData: [],
      topBrands: [],
      crisisAlerts: 0,
      trendingCount: 0,
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Get mentions from the last 30 days (to include all seeded data)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Build base query
  let mentionsQuery = supabase
    .from("brand_mentions")
    .select("*")
    .gte("posted_at", thirtyDaysAgo.toISOString())
    .order("posted_at", { ascending: true });

  // Apply brand filter if specified
  if (brandName && brandName.trim().length > 0) {
    mentionsQuery = mentionsQuery.eq("brand", brandName.trim());
  }

  const { data: mentions, error: mentionsError } = await mentionsQuery;

  if (mentionsError || !mentions) {
    console.error("Error fetching mentions:", mentionsError);
    return {
      dailyData: [],
      topBrands: [],
      crisisAlerts: 0,
      trendingCount: 0,
    };
  }

  // Get sentiment analyses for these mentions
  const mentionIds = mentions.map(m => m.id);
  const { data: analyses, error: analysesError } = await supabase
    .from("sentiment_analyses")
    .select("*")
    .in("mention_id", mentionIds);

  if (analysesError || !analyses) {
    console.error("Error fetching analyses:", analysesError);
    return {
      dailyData: [],
      topBrands: [],
      crisisAlerts: 0,
      trendingCount: 0,
    };
  }

  // Group by day and calculate metrics
  const dailyMap = new Map<string, {
    positive: number;
    neutral: number;
    negative: number;
    mentions: BrandMention[];
  }>();

  mentions.forEach(mention => {
    const date = new Date(mention.posted_at).toISOString().split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { positive: 0, neutral: 0, negative: 0, mentions: [] });
    }
    dailyMap.get(date)!.mentions.push(mention);
  });

  // Calculate sentiment for each day
  analyses.forEach(analysis => {
    const mention = mentions.find(m => m.id === analysis.mention_id);
    if (!mention) return;

    const date = new Date(mention.posted_at).toISOString().split('T')[0];
    const dayData = dailyMap.get(date);
    if (!dayData) return;

    if (analysis.sentiment_label === "positive") {
      dayData.positive++;
    } else if (analysis.sentiment_label === "neutral") {
      dayData.neutral++;
    } else if (analysis.sentiment_label === "negative") {
      dayData.negative++;
    }
  });

  // Convert to chart format with weighted sentiment
  const dailyData = Array.from(dailyMap.entries()).map(([date, data]) => {
    const dayMentions = data.mentions;
    const weightedSentiment = calculateWeightedSentiment(dayMentions, "positive") - 
                              calculateWeightedSentiment(dayMentions, "negative");

    return {
      date,
      positive: data.positive,
      neutral: data.neutral,
      negative: data.negative,
      totalMentions: dayMentions.length,
      weightedSentiment: Math.round(weightedSentiment * 100) / 100,
    };
  });

  // Calculate top brands
  const brandMap = new Map<string, BrandMention[]>();
  mentions.forEach(mention => {
    if (!brandMap.has(mention.brand)) {
      brandMap.set(mention.brand, []);
    }
    brandMap.get(mention.brand)!.push(mention);
  });

  const topBrands = Array.from(brandMap.entries()).map(([brand, brandMentions]) => {
    const brandAnalyses = analyses.filter(a => 
      brandMentions.some(m => m.id === a.mention_id)
    );
    
    const positiveCount = brandAnalyses.filter(a => a.sentiment_label === "positive").length;
    const totalCount = brandAnalyses.length;
    const avgSentiment = totalCount > 0 ? (positiveCount / totalCount) * 100 : 0;
    
    const weightedPositive = calculateWeightedSentiment(brandMentions, "positive");
    const weightedNegative = calculateWeightedSentiment(brandMentions, "negative");
    const weightedSentiment = (weightedPositive - weightedNegative) * 100;

    return {
      brand,
      mentions: brandMentions.length,
      avgSentiment: Math.round(avgSentiment),
      weightedSentiment: Math.round(weightedSentiment * 100) / 100,
    };
  }).sort((a, b) => b.mentions - a.mentions).slice(0, 10);

  // Count trending mentions (high engagement ratio)
  const trendingCount = mentions.filter(mention => {
    const influence = calculateInfluenceScore(mention);
    return influence.engagementRatio > 0.05 || influence.impactLevel === "viral";
  }).length;

  return {
    dailyData,
    topBrands,
    crisisAlerts: 0, // TODO: Implement crisis detection
    trendingCount,
  };
}

function exportToCSV(data: AnalyticsData) {
  const headers = ["Date", "Positive", "Neutral", "Negative", "Total Mentions", "Weighted Sentiment"];
  const csvContent = [
    headers.join(","),
    ...data.dailyData.map(row => 
      `${row.date},${row.positive},${row.neutral},${row.negative},${row.totalMentions},${row.weightedSentiment}`
    )
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sentiment-analytics-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    dailyData: [],
    topBrands: [],
    crisisAlerts: 0,
    trendingCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  // Fetch analytics data only when a brand is selected
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        if (!selectedBrand) {
          // CLEANUP: Reset data when no brand is selected
          setData({
            dailyData: [],
            topBrands: [],
            crisisAlerts: 0,
            trendingCount: 0,
          });
          return;
        }

        // TARGETED QUERY: Only fetch data for selected brand
        const analyticsData = await getAnalyticsData(selectedBrand);
        setData(analyticsData);
        
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        // CLEANUP: Reset data on error
        setData({
          dailyData: [],
          topBrands: [],
          crisisAlerts: 0,
          trendingCount: 0,
        });
      } finally {
        // PROPER STATE MANAGEMENT: Always reset loading state
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedBrand]);

  const handleBrandSelect = (brand: string | null) => {
    setSelectedBrand(brand);
  };

  if (!selectedBrand) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 py-8">
          <header className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Il Cervello · Advanced Analytics
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Sentiment Intelligence Dashboard
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <LiveMentionsStatus />
                <ThemeToggle />
              </div>
            </div>
            
            {/* Brand Selector */}
            <div className="mt-4 flex items-center gap-4">
              <BrandSelector 
                onBrandSelect={handleBrandSelect}
                placeholder="Select a brand to view analytics..."
                className="flex-1 max-w-md"
              />
            </div>
          </header>

          {/* Empty State */}
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <BarChart3 className="mx-auto h-16 w-16 text-zinc-400" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Select a Brand to View Analytics
            </h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Choose a brand from the dropdown above to see detailed sentiment analysis, trends, and performance metrics.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-zinc-500 dark:text-zinc-400">Loading analytics for {selectedBrand}...</div>
          </div>
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
                Analytics
              </h1>
            </div>

            <nav className="space-y-2">
              <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </Link>
              <Link href="/analytics" className="flex items-center gap-3 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Link>
              <Link href="/mentions" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
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
                  Il Cervello · Advanced Analytics
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Sentiment Intelligence Dashboard
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <LiveMentionsStatus />
                <ThemeToggle />
              </div>
            </div>
            
            {/* Brand Selector */}
            <div className="mt-4 flex items-center gap-4">
              <BrandSelector 
                onBrandSelect={handleBrandSelect}
                placeholder="Select a brand to view analytics..."
                className="flex-1 max-w-md"
              />
              {selectedBrand && (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Showing data for <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedBrand}</span>
                </div>
              )}
            </div>
          </header>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">7-Day Trend</p>
                <TrendingUp className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {data.dailyData.length > 0 ? 
                  data.dailyData[data.dailyData.length - 1].totalMentions : 0}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Total mentions
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Top Brand</p>
                <BarChart3 className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {data.topBrands[0]?.brand || "N/A"}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {data.topBrands[0]?.mentions || 0} mentions
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Trending</p>
                <Calendar className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {data.trendingCount}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                High engagement
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Export</p>
                <Download className="h-4 w-4 text-zinc-500" />
              </div>
              <button
                onClick={() => exportToCSV(data)}
                className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Download CSV
              </button>
            </div>
          </div>

          {/* Sentiment Trend Chart */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              7-Day Sentiment Trend
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f3f4f6"
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="positive"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                    name="Positive"
                  />
                  <Area
                    type="monotone"
                    dataKey="neutral"
                    stackId="1"
                    stroke="#6b7280"
                    fill="#6b7280"
                    fillOpacity={0.6}
                    name="Neutral"
                  />
                  <Area
                    type="monotone"
                    dataKey="negative"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.6}
                    name="Negative"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Brands Table */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Top Brands Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">Brand</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">Mentions</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">Avg Sentiment</th>
                    <th className="text-right py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">Weighted Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topBrands.map((brand, index) => (
                    <tr key={brand.brand} className={index % 2 === 0 ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}>
                      <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">{brand.brand}</td>
                      <td className="text-right py-3 px-4 text-zinc-600 dark:text-zinc-400">{brand.mentions}</td>
                      <td className="text-right py-3 px-4 text-zinc-600 dark:text-zinc-400">{brand.avgSentiment}%</td>
                      <td className="text-right py-3 px-4">
                        <span className={`font-medium ${
                          brand.weightedSentiment > 10 ? "text-emerald-600" : 
                          brand.weightedSentiment < -10 ? "text-rose-600" : 
                          "text-zinc-600"
                        }`}>
                          {brand.weightedSentiment > 0 ? "+" : ""}{brand.weightedSentiment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
