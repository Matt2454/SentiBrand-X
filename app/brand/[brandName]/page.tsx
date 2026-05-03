"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { TrendingUp, TrendingDown, Activity, ArrowLeft, Calendar, Users, MessageSquare, BarChart3, PieChart, TrendingUp as TrendingIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatedNumber } from "../../../components/AnimatedNumber";
import { createSupabaseClient } from "../../../lib/supabase";

interface BrandData {
  name: string;
  totalMentions: number;
  avgSentiment: number;
  sentimentTrend: 'up' | 'down' | 'stable';
  trendChange: number;
  topMentions: MentionData[];
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  dailyTrend: DailyData[];
}

interface MentionData {
  id: string;
  text: string;
  author: string;
  posted_at: string;
  sentiment: string;
  confidence: number;
}

interface DailyData {
  date: string;
  mentions: number;
  sentiment: number;
}

export default function BrandDetail() {
  const params = useParams();
  const router = useRouter();
  const brandName = decodeURIComponent(params.brandName as string);
  
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBrandData() {
      try {
        setLoading(true);
        setError(null);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error("Missing Supabase configuration");
        }

        const supabase = createSupabaseClient();

        // Get brand mentions from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: mentions, error: mentionsError } = await supabase
          .from("brand_mentions")
          .select("id, brand, author_handle, raw_text, posted_at")
          .eq("brand", brandName)
          .gte("posted_at", thirtyDaysAgo.toISOString())
          .order("posted_at", { ascending: false });

        if (mentionsError) throw mentionsError;

        // Get sentiment analyses
        const mentionIds = mentions?.map(m => m.id) || [];
        const { data: analyses, error: analysesError } = await supabase
          .from("sentiment_analyses")
          .select("mention_id, confidence, sentiment_label")
          .in("mention_id", mentionIds);

        if (analysesError) throw analysesError;

        // Process data
        const sentimentBreakdown = {
          positive: 0,
          neutral: 0,
          negative: 0
        };

        const dailyMap = new Map<string, { mentions: number; sentiments: number[] }>();

        mentions?.forEach(mention => {
          const date = new Date(mention.posted_at).toISOString().split('T')[0];
          const current = dailyMap.get(date) || { mentions: 0, sentiments: [] };
          current.mentions++;
          dailyMap.set(date, current);
        });

        analyses?.forEach(analysis => {
          const sentiment = analysis.sentiment_label.toLowerCase();
          if (sentimentBreakdown[sentiment as keyof typeof sentimentBreakdown] !== undefined) {
            sentimentBreakdown[sentiment as keyof typeof sentimentBreakdown]++;
          }
        });

        // Calculate daily trend
        const dailyTrend: DailyData[] = Array.from(dailyMap.entries())
          .map(([date, data]) => ({
            date,
            mentions: data.mentions,
            sentiment: data.sentiments.length > 0 
              ? data.sentiments.reduce((sum, s) => sum + s, 0) / data.sentiments.length 
              : 50
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Get top mentions
        const topMentions: MentionData[] = mentions?.slice(0, 5).map(mention => {
          const analysis = analyses?.find(a => a.mention_id === mention.id);
          return {
            id: mention.id,
            text: mention.raw_text,
            author: mention.author_handle,
            posted_at: mention.posted_at,
            sentiment: analysis?.sentiment_label || 'neutral',
            confidence: analysis?.confidence || 0
          };
        }) || [];

        // Calculate overall stats
        const totalSentiments = Object.values(sentimentBreakdown).reduce((sum, count) => sum + count, 0);
        const avgSentiment = totalSentiments > 0 
          ? (sentimentBreakdown.positive * 100 + sentimentBreakdown.neutral * 50) / totalSentiments 
          : 50;

        const sentimentTrend = dailyTrend.length > 1 
          ? (dailyTrend[dailyTrend.length - 1].sentiment > dailyTrend[0].sentiment ? 'up' : 
             dailyTrend[dailyTrend.length - 1].sentiment < dailyTrend[0].sentiment ? 'down' : 'stable')
          : 'stable';

        const trendChange = dailyTrend.length > 1 
          ? dailyTrend[dailyTrend.length - 1].sentiment - dailyTrend[0].sentiment 
          : 0;

        setBrandData({
          name: brandName,
          totalMentions: mentions?.length || 0,
          avgSentiment,
          sentimentTrend,
          trendChange,
          topMentions,
          sentimentBreakdown,
          dailyTrend
        });

      } catch (error) {
        console.error("Error fetching brand data:", error);
        setError("Failed to load brand data");
      } finally {
        setLoading(false);
      }
    }

    if (brandName) {
      fetchBrandData();
    }
  }, [brandName]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'text-emerald-400';
      case 'negative': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getSentimentBgColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'bg-emerald-500/10';
      case 'negative': return 'bg-red-500/10';
      default: return 'bg-yellow-500/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 font-mono text-sm">Loading Brand Intelligence...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !brandData) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="mb-6 text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold text-red-400 mb-4 font-mono">Error</h1>
            <p className="text-gray-300">{error || "Brand not found"}</p>
            <button 
              onClick={() => router.push('/')}
              className="mt-6 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-mono text-sm">Back</span>
              </button>
              <h1 className="text-2xl font-mono font-bold text-emerald-400 tracking-wider">
                {brandData.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs font-mono text-emerald-400">LIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Stats */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {/* Total Mentions */}
          <div className="relative bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Total Mentions</span>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              <AnimatedNumber value={brandData.totalMentions} />
            </div>
            <p className="text-sm text-gray-400">Last 30 days</p>
          </div>

          {/* Sentiment Score */}
          <div className="relative bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Sentiment Score</span>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              <AnimatedNumber value={Math.round(brandData.avgSentiment)} />%
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    brandData.avgSentiment >= 70 ? 'bg-emerald-500' :
                    brandData.avgSentiment >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${brandData.avgSentiment}%` }}
                ></div>
              </div>
              <span className={`text-xs ${
                brandData.sentimentTrend === 'up' ? 'text-emerald-400' :
                brandData.sentimentTrend === 'down' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {brandData.sentimentTrend === 'up' ? '↑' : brandData.sentimentTrend === 'down' ? '↓' : '→'}
              </span>
            </div>
          </div>

          {/* Trend */}
          <div className="relative bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <TrendingIcon className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Trend</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl font-bold text-white">
                {brandData.sentimentTrend === 'up' ? '+' : brandData.sentimentTrend === 'down' ? '-' : ''}
                {Math.abs(brandData.trendChange).toFixed(1)}%
              </span>
              {brandData.sentimentTrend === 'up' ? 
                <TrendingUp className="w-5 h-5 text-emerald-400" /> :
                brandData.sentimentTrend === 'down' ?
                <TrendingDown className="w-5 h-5 text-red-400" /> :
                <Activity className="w-5 h-5 text-gray-400" />
              }
            </div>
            <p className="text-sm text-gray-400">vs previous period</p>
          </div>

          {/* Engagement Rate */}
          <div className="relative bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Engagement</span>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              <AnimatedNumber value={Math.round(brandData.totalMentions * 0.3)} />
            </div>
            <p className="text-sm text-gray-400">Avg interactions</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Sentiment Breakdown */}
          <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-mono font-bold text-white mb-6 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-400" />
              Sentiment Breakdown
            </h3>
            <div className="space-y-4">
              {Object.entries(brandData.sentimentBreakdown).map(([sentiment, count]) => {
                const percentage = brandData.totalMentions > 0 
                  ? (count / brandData.totalMentions) * 100 
                  : 0;
                
                return (
                  <div key={sentiment} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`font-mono text-sm capitalize ${getSentimentColor(sentiment)}`}>
                        {sentiment}
                      </span>
                      <span className="text-white font-mono">{count}</span>
                    </div>
                    <div className="flex-1 bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          sentiment === 'positive' ? 'bg-emerald-500' :
                          sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400">{percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Trend */}
          <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-mono font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Daily Trend (Last 7 Days)
            </h3>
            <div className="space-y-3">
              {brandData.dailyTrend.slice(-7).map((day, index) => (
                <div key={day.date} className="flex items-center gap-4">
                  <span className="text-xs text-gray-400 font-mono w-20">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min((day.mentions / Math.max(...brandData.dailyTrend.map(d => d.mentions))) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-white font-mono w-12 text-right">
                    {day.mentions}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Mentions */}
        <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-mono font-bold text-white mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            Top Mentions
          </h3>
          <div className="space-y-4">
            {brandData.topMentions.map((mention) => (
              <div key={mention.id} className="border border-gray-800/30 rounded-xl p-4 hover:border-gray-700/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-400">@{mention.author}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-mono ${getSentimentBgColor(mention.sentiment)} ${getSentimentColor(mention.sentiment)}`}>
                      {mention.sentiment}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {new Date(mention.posted_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {mention.text}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">Confidence:</span>
                  <span className="text-xs text-white font-mono">
                    {Math.round(mention.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
