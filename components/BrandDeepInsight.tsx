'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, Zap, BarChart3, MessageSquare } from 'lucide-react';

interface BrandInsightData {
  totalMentions: number;
  avgSentiment: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  timelineData: Array<{
    date: string;
    sentiment: number;
    mentions: number;
  }>;
  recentMentions: Array<{
    id: string;
    text: string;
    author: string;
    posted_at: string;
    sentiment: number;
    confidence: number;
  }>;
}

const SENTIMENT_COLORS = {
  positive: '#10b981', // emerald-500
  neutral: '#f59e0b',  // amber-500  
  negative: '#ef4444'  // red-500
};

export default function BrandDeepInsight({ brandName }: { brandName: string }) {
  const router = useRouter();
  const [data, setData] = useState<BrandInsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBrandInsights();
  }, [brandName]);

  const fetchBrandInsights = async () => {
    try {
      setLoading(true);
      const supabase = createSupabaseClient();
      
      // Get brand mentions with sentiment data
      const { data: mentions, error: mentionsError } = await supabase
        .from('brand_mentions')
        .select('id, brand, author_handle, raw_text, posted_at')
        .eq('brand', brandName)
        .order('posted_at', { ascending: false })
        .limit(1000);

      if (mentionsError) throw mentionsError;

      // Get sentiment analyses for these mentions
      const mentionIds = mentions?.map(m => m.id) || [];
      const { data: analyses, error: analysesError } = await supabase
        .from('sentiment_analyses')
        .select('mention_id, confidence, sentiment_label')
        .in('mention_id', mentionIds);

      if (analysesError) throw analysesError;

      // Process data
      const processedData = processInsightData(mentions || [], analyses || []);
      setData(processedData);
    } catch (err) {
      console.error('Error fetching brand insights:', err);
      setError('Failed to load brand insights');
    } finally {
      setLoading(false);
    }
  };

  const processInsightData = (mentions: any[], analyses: any[]): BrandInsightData => {
    // Calculate sentiment distribution
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    let totalSentiment = 0;
    let sentimentCount = 0;

    const analysisMap = new Map(analyses.map(a => [a.mention_id, a]));
    
    mentions.forEach(mention => {
      const analysis = analysisMap.get(mention.id);
      if (analysis) {
        const sentiment = analysis.confidence * 100;
        totalSentiment += sentiment;
        sentimentCount++;
        
        if (sentiment >= 70) sentimentCounts.positive++;
        else if (sentiment >= 40) sentimentCounts.neutral++;
        else sentimentCounts.negative++;
      }
    });

    // Process timeline data (group by date)
    const timelineMap = new Map<string, { sentiment: number; mentions: number }>();
    
    mentions.forEach(mention => {
      const date = new Date(mention.posted_at).toLocaleDateString();
      const analysis = analysisMap.get(mention.id);
      
      if (!timelineMap.has(date)) {
        timelineMap.set(date, { sentiment: 0, mentions: 0 });
      }
      
      const dayData = timelineMap.get(date)!;
      dayData.mentions++;
      
      if (analysis) {
        dayData.sentiment += analysis.confidence * 100;
      }
    });

    const timelineData = Array.from(timelineMap.entries())
      .map(([date, data]) => ({
        date,
        sentiment: data.mentions > 0 ? data.sentiment / data.mentions : 50,
        mentions: data.mentions
      }))
      .slice(-30) // Last 30 days
      .reverse();

    // Get recent mentions for the feed
    const recentMentions = mentions.slice(-10).reverse().map(mention => {
      const analysis = analysisMap.get(mention.id);
      return {
        id: mention.id,
        text: mention.raw_text || mention.text || 'Mention content',
        author: mention.author_handle || '@user',
        posted_at: mention.posted_at,
        sentiment: analysis ? analysis.confidence * 100 : 50,
        confidence: analysis ? analysis.confidence : 0.5
      };
    });

    const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 50;

    return {
      totalMentions: mentions.length,
      avgSentiment: parseFloat(avgSentiment.toFixed(1)),
      sentimentDistribution: sentimentCounts,
      timelineData,
      recentMentions
    };
  };

  const pieData = [
    { name: 'Positive', value: data?.sentimentDistribution.positive || 0, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: data?.sentimentDistribution.neutral || 0, color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: data?.sentimentDistribution.negative || 0, color: SENTIMENT_COLORS.negative }
  ];

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 70) return 'text-emerald-400';
    if (sentiment >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getSentimentBgColor = (sentiment: number) => {
    if (sentiment >= 70) return 'bg-emerald-500/20';
    if (sentiment >= 40) return 'bg-amber-500/20';
    return 'bg-red-500/20';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-mono">Loading brand insights...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 font-mono mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800/50 dark:border-gray-800/50 bg-gray-950/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-800/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-mono font-bold text-emerald-400 tracking-wider">
                  {brandName.toUpperCase()}
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-400 font-mono">Brand Deep Insights</p>
              </div>
            </div>
            
            {/* Hero Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-500 font-mono uppercase">Total Mentions</p>
                <p className="text-2xl font-bold text-white dark:text-white font-mono">{data.totalMentions}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-500 font-mono uppercase">Avg Sentiment</p>
                <p className={`text-2xl font-bold font-mono ${getSentimentColor(data.avgSentiment)}`}>
                  {data.avgSentiment > 0 ? '+' : ''}{data.avgSentiment}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Charts Section */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Sentiment Distribution - Doughnut Chart */}
          <div className="relative bg-gray-900/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-800/50 dark:border-gray-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-mono font-bold text-white dark:text-white">Sentiment Distribution</h2>
              </div>
            </div>
            
            <div className="relative">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#111827', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontFamily: 'monospace'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className={`text-3xl font-bold font-mono ${getSentimentColor(data.avgSentiment)}`}>
                    {data.avgSentiment > 0 ? '+' : ''}{data.avgSentiment}%
                  </p>
                  <p className="text-xs text-gray-400 font-mono uppercase">Average Score</p>
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex justify-center gap-6 mt-6">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-400 dark:text-gray-400 font-mono">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sentiment Trend - Area Chart */}
          <div className="relative bg-gray-900/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-800/50 dark:border-gray-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-mono font-bold text-white dark:text-white">Sentiment Trend</h2>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={data.timelineData}>
                <defs>
                  <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111827', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontFamily: 'monospace'
                  }}
                  formatter={(value: any) => [
                    `${parseFloat(value).toFixed(1)}%`, 
                    'Sentiment Score'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="sentiment" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fill="url(#colorSentiment)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Mentions Section */}
      <div className="container mx-auto px-6 py-8">
        <div className="bg-gray-900/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-800/50 dark:border-gray-800/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-6 text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Live Feed: {brandName}
          </h3>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.recentMentions?.map((mention) => (
              <div key={mention.id} className="p-4 rounded-xl border border-white/10 dark:border-white/10 bg-black/20 dark:bg-black/20 backdrop-blur-md hover:border-white/20 dark:hover:border-white/20 transition-all duration-300">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-400 dark:text-gray-400 font-mono">
                    {new Date(mention.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    mention.sentiment >= 70 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                      mention.sentiment >= 40 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                      'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {mention.sentiment > 0 ? '+' : ''}{mention.sentiment.toFixed(1)}%
                    </span>
                </div>
                <p className="text-gray-200 dark:text-gray-200 text-sm leading-relaxed">{mention.text}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400 dark:text-gray-400 font-mono">@{mention.author}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">•</span>
                  <span className="text-xs text-gray-400 dark:text-gray-400 font-mono">
                    Confidence: {Math.round(mention.confidence * 100)}%
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
