"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { TrendingUp, TrendingDown, Activity, Zap, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatedNumber } from "./AnimatedNumber";

interface BrandData {
  name: string;
  sentiment: number;
  mentions: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

interface HeroStats {
  totalMentions: number;
  avgSentiment: number;
  topBrand: string;
  sentimentTrend: 'up' | 'down' | 'stable';
  trendChange: number;
}

export function CyberDashboard() {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [heroStats, setHeroStats] = useState({
    totalMentions: 0,
    avgSentiment: 0,
    topBrand: '',
    sentimentTrend: 'stable',
    trendChange: 0
  });
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Simulated connection status
  useEffect(() => {
    const checkConnection = async () => {
      console.log("🔍 Checking Supabase connection...");
      console.log("Environment variables:", {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"
      });
      
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseAnonKey) {
          console.log("🔗 Creating Supabase client...");
          const supabase = createClient(supabaseUrl, supabaseAnonKey);
          
          console.log("📡 Testing connection with simple query...");
          const { data, error } = await supabase.from('brand_mentions').select('id').limit(1);
          
          if (error) {
            console.error("❌ Supabase query error:", error);
            setIsConnected(false);
          } else {
            console.log("✅ Supabase connection successful, data:", data);
            setIsConnected(true);
          }
        } else {
          console.error("❌ Missing Supabase environment variables");
          setIsConnected(false);
        }
      } catch (error) {
        console.error("💥 Connection check failed:", error);
        setIsConnected(false);
        setTimeout(checkConnection, 3000); // Retry in 3 seconds
      }
    };

    checkConnection();
  }, []);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        console.log("🚀 Starting data fetch...");
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        console.log("🔧 Supabase config:", {
          url: supabaseUrl ? "✅ Set" : "❌ Missing",
          key: supabaseAnonKey ? "✅ Set" : "❌ Missing"
        });
        
        if (!supabaseUrl || !supabaseAnonKey) {
          console.error("❌ Missing Supabase configuration");
          return;
        }

        console.log("🔗 Creating Supabase client...");
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Get brand mentions and sentiment data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();
        
        console.log("📅 Query date range:", {
          from: thirtyDaysAgoISO,
          days: 30
        });

        console.log("📡 Fetching brand mentions...");
        const { data: mentions, error: mentionsError } = await supabase
          .from("brand_mentions")
          .select("id, brand, posted_at")
          .gte("posted_at", thirtyDaysAgoISO);

        if (mentionsError) {
          console.error("❌ Mentions query error:", mentionsError);
          throw mentionsError;
        }

        console.log("✅ Mentions fetched:", mentions?.length || 0, "records");

        // Get sentiment analyses
        const mentionIds = mentions?.map(m => m.id) || [];
        console.log("🔍 Processing", mentionIds.length, "mention IDs for sentiment analysis");

        if (mentionIds.length === 0) {
          console.log("⚠️ No mentions found, skipping sentiment analysis");
          // Set empty state data
          setBrands([]);
          setHeroStats({
            totalMentions: 0,
            avgSentiment: 0,
            topBrand: 'No data',
            sentimentTrend: 'stable',
            trendChange: 0
          });
          setLoading(false);
          return;
        }

        console.log("📡 Fetching sentiment analyses...");
        
        // First, let's check what columns actually exist in the table
        console.log("🔍 Checking sentiment_analyses table structure...");
        const { data: tableInfo, error: tableError } = await supabase
          .from("sentiment_analyses")
          .select("*")
          .limit(1);
          
        if (tableError) {
          console.error("❌ Table structure check failed:", tableError);
        } else if (tableInfo && tableInfo.length > 0) {
          console.log("✅ Found table columns:", Object.keys(tableInfo[0]));
        }
        
        // Now try the actual query with correct column names
        console.log("🔍 Query details:", {
          mentionIdsLength: mentionIds.length,
          firstFewIds: mentionIds.slice(0, 3),
          hasData: mentionIds.length > 0
        });

        if (mentionIds.length === 0) {
          console.log("⚠️ No mention IDs to query, skipping sentiment analysis");
          // Set empty state data
          setBrands([]);
          setHeroStats({
            totalMentions: 0,
            avgSentiment: 0,
            topBrand: 'No data',
            sentimentTrend: 'stable',
            trendChange: 0
          });
          setLoading(false);
          return;
        }

        // Try a simpler query first to test connection
        console.log("🧪 Testing simple query...");
        const { data: testData, error: testError } = await supabase
          .from("sentiment_analyses")
          .select("mention_id")
          .limit(1);

        if (testError) {
          console.error("❌ Simple query failed:", testError);
          throw testError;
        }

        console.log("✅ Simple query successful, data:", testData);

        // Try alternative approach: get all recent analyses and filter client-side
        console.log("📡 Fetching all recent sentiment analyses...");
        const { data: allAnalyses, error: allAnalysesError } = await supabase
          .from("sentiment_analyses")
          .select("mention_id, confidence, sentiment_label")
          .order("created_at", { ascending: false })
          .limit(1000); // Get recent analyses

        if (allAnalysesError) {
          console.error("❌ All analyses query error:", allAnalysesError);
          console.error("Error details:", JSON.stringify(allAnalysesError, null, 2));
          
          // Try fallback without sentiment data
          console.log("🔄 Trying fallback without sentiment data...");
          
          // Process mentions without sentiment data
          const fallbackBrandMap = new Map<string, { mentions: number }>();
          mentions?.forEach(mention => {
            const current = fallbackBrandMap.get(mention.brand) || { mentions: 0 };
            current.mentions++;
            fallbackBrandMap.set(mention.brand, current);
          });
          
          const processedBrands = Array.from(fallbackBrandMap.entries()).map(([name, data]) => {
            const avgSentiment = 50; // Default neutral sentiment
            
            // Simulate trend (in real app, compare with previous period)
            const randomValue = Math.random();
            let trend: 'up' | 'down' | 'stable';
            if (randomValue > 0.66) {
              trend = 'up';
            } else if (randomValue > 0.33) {
              trend = 'down';
            } else {
              trend = 'stable';
            }
            
            const change = trend === 'up' ? Math.random() * 20 : trend === 'down' ? -Math.random() * 20 : 0;

            return {
              name,
              sentiment: avgSentiment,
              mentions: data.mentions,
              trend,
              change
            };
          }).sort((a, b) => b.mentions - a.mentions);

          const totalMentions = processedBrands.reduce((sum, brand) => sum + brand.mentions, 0);
          const avgSentiment = processedBrands.length > 0
            ? Math.round(processedBrands.reduce((sum, brand) => sum + brand.sentiment, 0) / processedBrands.length)
            : 0;
          const topBrand = processedBrands[0]?.name || 'No data';
          
          // Simulate sentiment trend
          const sentimentTrend = Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable';
          const trendChange = sentimentTrend === 'up' ? 8.5 : sentimentTrend === 'down' ? -3.2 : 0;

          setBrands(processedBrands.slice(0, 8));
          setHeroStats({
            totalMentions,
            avgSentiment,
            topBrand,
            sentimentTrend,
            trendChange
          });
          setLoading(false);
          return;
        }

        // Filter analyses to only include those that match our mention IDs
        const analyses = allAnalyses?.filter(analysis => mentionIds.includes(analysis.mention_id)) || [];
        console.log("✅ Analyses fetched:", analyses.length, "records (from", allAnalyses?.length || 0, "total)");

        // Process data
        const brandMap = new Map<string, { mentions: number; sentiments: number[] }>();
        
        mentions?.forEach(mention => {
          const current = brandMap.get(mention.brand) || { mentions: 0, sentiments: [] };
          current.mentions++;
          brandMap.set(mention.brand, current);
        });

        analyses.forEach((analysis: any) => {
          const mention = mentions?.find(m => m.id === analysis.mention_id);
          if (mention) {
            const current = brandMap.get(mention.brand) || { mentions: 0, sentiments: [] };
            // Convert confidence (0-1) to sentiment score (0-100)
            const sentimentScore = analysis.confidence ? analysis.confidence * 100 : 50;
            current.sentiments.push(sentimentScore);
            brandMap.set(mention.brand, current);
          }
        });

        // Convert to BrandData format
        const processedBrands: BrandData[] = Array.from(brandMap.entries()).map(([name, data]) => {
          const avgSentiment = data.sentiments.length > 0 
            ? (data.sentiments.reduce((sum, score) => sum + score, 0) / data.sentiments.length)
            : 50;
          
          // Simulate trend (in real app, compare with previous period)
          const randomValue = Math.random();
          let trend: 'up' | 'down' | 'stable';
          if (randomValue > 0.66) {
            trend = 'up';
          } else if (randomValue > 0.33) {
            trend = 'down';
          } else {
            trend = 'stable';
          }
          
          const change = trend === 'up' ? Math.random() * 20 : trend === 'down' ? -Math.random() * 20 : 0;

          return {
            name,
            sentiment: Math.round(avgSentiment),
            mentions: data.mentions,
            trend,
            change
          };
        }).sort((a, b) => b.mentions - a.mentions);

        // Calculate hero stats
        const totalMentions = processedBrands.reduce((sum, brand) => sum + brand.mentions, 0);
        const avgSentiment = processedBrands.length > 0
          ? Math.round(processedBrands.reduce((sum, brand) => sum + brand.sentiment, 0) / processedBrands.length)
          : 0;
        const topBrand = processedBrands[0]?.name || '';
        
        // Simulate sentiment trend
        const sentimentTrend = Math.random() > 0.6 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable';
        const trendChange = sentimentTrend === 'up' ? 8.5 : sentimentTrend === 'down' ? -3.2 : 0;

        setBrands(processedBrands.slice(0, 8)); // Top 8 brands
        setHeroStats({
          totalMentions,
          avgSentiment,
          topBrand,
          sentimentTrend,
          trendChange
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        
        // Type-safe error logging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorDetails = error && typeof error === 'object' ? JSON.stringify(error) : 'No details';
        
        console.error("Error details:", {
          message: errorMessage,
          details: errorDetails
        });
        
        // Set fallback data to prevent UI from breaking
        setBrands([]);
        setHeroStats({
          totalMentions: 0,
          avgSentiment: 0,
          topBrand: 'No data',
          sentimentTrend: 'stable',
          trendChange: 0
        });
      } finally {
        setLoading(false);
      }
    }

    if (isConnected) {
      fetchData();
    }
  }, [isConnected]);

  // Helper functions for styling
  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 70) return 'text-emerald-400';
    if (sentiment >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSentimentBgColor = (sentiment: number) => {
    if (sentiment >= 70) return 'bg-emerald-500/20';
    if (sentiment >= 40) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  const getSentimentBorderColor = (sentiment: number) => {
    if (sentiment >= 70) return 'border-emerald-500/30';
    if (sentiment >= 40) return 'border-yellow-500/30';
    return 'border-red-500/30';
  };

  const getGlowColor = (sentiment: number) => {
    if (sentiment >= 70) return 'shadow-emerald-500/50';
    if (sentiment >= 40) return 'shadow-yellow-500/30';
    return 'shadow-red-500/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 font-mono text-sm">Initializing Sentibrand...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if environment variables are missing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="mb-6 text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold text-red-400 mb-4 font-mono">Configuration Error</h1>
            <p className="text-gray-300 mb-6">Missing Supabase credentials</p>
            <div className="bg-gray-900/60 backdrop-blur-md border border-red-500/30 rounded-2xl p-6">
              <p className="text-red-400 font-mono text-sm mb-4">
                Please configure your environment variables:
              </p>
              <div className="text-left space-y-2">
                <div>
                  <span className="text-gray-400">NEXT_PUBLIC_SUPABASE_URL:</span>
                  <span className="text-red-400 ml-2">❌ Not Set</span>
                </div>
                <div>
                  <span className="text-gray-400">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
                  <span className="text-red-400 ml-2">❌ Not Set</span>
                </div>
              </div>
              <p className="text-gray-400 text-xs mt-4">
                Copy .env.example to .env.local and fill in your Supabase credentials
              </p>
            </div>
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
            <h1 className="text-2xl font-mono font-bold text-emerald-400 tracking-wider">
              SENTIBRAND
            </h1>
            
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                isConnected 
                  ? 'border-emerald-500/30 bg-emerald-500/10' 
                  : 'border-red-500/30 bg-red-500/10'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}></div>
                <span className={`text-xs font-mono ${
                  isConnected ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Stats */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Volume Card */}
          <div className="relative bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Volume</span>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              <AnimatedNumber value={heroStats.totalMentions} />
            </div>
            <p className="text-sm text-gray-400">Total Mentions</p>
          </div>

          {/* Sentiment Score Card */}
          <div className="relative bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Sentiment</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`text-3xl font-bold ${getSentimentColor(heroStats.avgSentiment)}`}>
                {heroStats.avgSentiment > 0 ? '+' : ''}{heroStats.avgSentiment}
              </div>
              {heroStats.sentimentTrend !== 'stable' && (
                heroStats.sentimentTrend === 'up' ? 
                  <TrendingUp className="w-5 h-5 text-emerald-400" /> :
                  <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-800 rounded-full h-1 mb-2">
              <div 
                className={`h-1 rounded-full transition-all duration-500 ${
                  heroStats.avgSentiment >= 70 ? 'bg-emerald-400' :
                  heroStats.avgSentiment >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, heroStats.avgSentiment))}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400">Average Score</p>
          </div>

          {/* Trend Card */}
          <div className="relative bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Trend</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl font-bold text-white">
                {heroStats.topBrand}
              </div>
            </div>
            <p className="text-sm text-gray-400">Top Brand</p>
          </div>
        </div>

        {/* Brand Feed */}
        <div className="space-y-4">
          <h2 className="text-xl font-mono font-bold text-white mb-6">Brand Intelligence Feed</h2>
          
          <div className="grid gap-4">
            {brands.map((brand, index) => (
              <div
                key={brand.name}
                className={`relative bg-gray-900/60 backdrop-blur-md border ${getSentimentBorderColor(brand.sentiment)} rounded-2xl p-6 hover:transform hover:scale-102 hover:translate-y-[-2px] transition-all duration-300 cursor-pointer group hover:shadow-lg ${getGlowColor(brand.sentiment)}`}
                onClick={() => router.push(`/brand/${encodeURIComponent(brand.name)}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Brand Name */}
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{brand.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{brand.mentions.toLocaleString()} mentions</span>
                        {brand.trend !== 'stable' && (
                          <div className={`flex items-center gap-1 text-xs ${
                            brand.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {brand.trend === 'up' ? 
                              <TrendingUp className="w-3 h-3" /> :
                              <TrendingDown className="w-3 h-3" />
                            }
                            {Math.abs(brand.change).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sentiment Badge */}
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getSentimentBorderColor(brand.sentiment)} ${getSentimentBgColor(brand.sentiment)} group-hover:border-opacity-60 transition-all duration-300`}>
                    <div className={`w-2 h-2 rounded-full ${
                      brand.sentiment >= 70 ? 'bg-emerald-400 shadow-emerald-400/50 shadow-sm' :
                      brand.sentiment >= 40 ? 'bg-yellow-400 shadow-yellow-400/30 shadow-sm' :
                      'bg-red-400 shadow-red-400/30 shadow-sm'
                    }`}></div>
                    <span className={`font-bold text-sm ${getSentimentColor(brand.sentiment)}`}>
                      {brand.sentiment > 0 ? '+' : ''}{brand.sentiment}%
                    </span>
                  </div>
                </div>

                {/* Hover Effect Border */}
                <div className={`absolute inset-0 rounded-2xl border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                  brand.sentiment >= 70 ? 'border-emerald-400/30' :
                  brand.sentiment >= 40 ? 'border-yellow-400/20' :
                  'border-red-400/20'
                }`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
