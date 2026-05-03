'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Activity, MessageSquare, Clock, User } from 'lucide-react';

interface ProductData {
  id: string;
  name: string;
  brand: string;
  keywords: string[];
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
  positive: '#10b981',
  neutral: '#f59e0b', 
  negative: '#ef4444'
};

export default function ProductInsight({ brandName, productName }: { brandName: string; productName: string }) {
  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productKeywords, setProductKeywords] = useState<string[]>([]);

  useEffect(() => {
    console.log('ProductInsight useEffect - brandName:', brandName, 'productName:', productName);
    if (!brandName || !productName || brandName === 'undefined' || productName === 'undefined') {
      setError('Brand name and product name are required');
      setLoading(false);
      return;
    }
    fetchProductInsights();
  }, [brandName, productName]);

  const fetchProductInsights = async () => {
    try {
      setLoading(true);
      const supabase = createSupabaseClient();
      
      // First, get product info to extract keywords
      const brandId = await getBrandId(brandName);
      if (!brandId) {
        throw new Error(`Brand "${brandName}" not found`);
      }
      
      const { data: productInfo, error: productError } = await supabase
        .from('products')
        .select('keywords, name')
        .eq('name', productName)
        .eq('brand_id', brandId)
        .single();

      if (productError && productError.code !== 'PGRST116') {
        throw productError;
      }

      const keywords = productInfo?.keywords || [productName]; // Fallback to product name
      setProductKeywords(keywords);

      // Get brand mentions filtered by product keywords
      let query = supabase
        .from('brand_mentions')
        .select('id, brand, author_handle, raw_text, posted_at')
        .eq('brand', brandName);

      // Apply keyword filtering
      keywords.forEach((keyword: string) => {
        query = query.or(`raw_text.ilike.%${keyword}%`);
      });

      const { data: mentions, error: mentionsError } = await query
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
      const processedData = processProductInsightData(mentions || [], analyses || [], keywords);
      setData(processedData);
    } catch (err) {
      console.error('Error fetching product insights:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      setError(`Failed to load product insights: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getBrandId = async (brandName: string) => {
    const supabase = createSupabaseClient();
    const { data } = await supabase
      .from('brands')
      .select('id')
      .eq('name', brandName)
      .single();
    return data?.id;
  };

  const processProductInsightData = (mentions: any[], analyses: any[], keywords: string[]): ProductData => {
    // Calculate sentiment distribution
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    let totalSentiment = 0;
    let sentimentCount = 0;

    const analysisMap = new Map(analyses.map(a => [a.mention_id, a]));
    
    mentions.forEach(mention => {
      const analysis = analysisMap.get(mention.id);
      if (analysis) {
        // Use sentiment_label instead of confidence
        const label = analysis.sentiment_label?.toLowerCase();
        
        if (label === 'positive') {
          sentimentCounts.positive++;
          totalSentiment += 85;
        } else if (label === 'neutral') {
          sentimentCounts.neutral++;
          totalSentiment += 50;
        } else if (label === 'negative') {
          sentimentCounts.negative++;
          totalSentiment += 15;
        } else {
          // Fallback
          const sentiment = analysis.confidence * 100;
          totalSentiment += sentiment;
          sentimentCount++;
          
          if (sentiment >= 70) sentimentCounts.positive++;
          else if (sentiment >= 40) sentimentCounts.neutral++;
          else sentimentCounts.negative++;
          return;
        }
        
        sentimentCount++;
      }
    });

    // Process timeline data
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
        const label = analysis.sentiment_label?.toLowerCase();
        if (label === 'positive') {
          dayData.sentiment += 85;
        } else if (label === 'neutral') {
          dayData.sentiment += 50;
        } else if (label === 'negative') {
          dayData.sentiment += 15;
        }
      }
    });

    const timelineData = Array.from(timelineMap.entries())
      .map(([date, data]) => ({
        date,
        sentiment: data.mentions > 0 ? data.sentiment / data.mentions : 50,
        mentions: data.mentions
      }))
      .slice(-30)
      .reverse();

    // Get recent mentions
    const recentMentions = mentions.slice(-10).reverse().map(mention => {
      const analysis = analysisMap.get(mention.id);
      let sentiment = 50;
      let confidence = analysis ? analysis.confidence : 0.5;
      
      if (analysis) {
        const label = analysis.sentiment_label?.toLowerCase();
        if (label === 'positive') {
          sentiment = 85;
        } else if (label === 'neutral') {
          sentiment = 50;
        } else if (label === 'negative') {
          sentiment = 15;
        }
      }
      
      return {
        id: mention.id,
        text: mention.raw_text || mention.text || 'Mention content',
        author: mention.author_handle || '@user',
        posted_at: mention.posted_at,
        sentiment,
        confidence
      };
    });

    const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 50;

    return {
      id: productName,
      name: productName,
      brand: brandName,
      keywords,
      totalMentions: mentions.length,
      avgSentiment: parseFloat(avgSentiment.toFixed(1)),
      sentimentDistribution: sentimentCounts,
      timelineData,
      recentMentions
    };
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 70) return 'text-emerald-400';
    if (sentiment >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const pieData = [
    { name: 'Positive', value: data?.sentimentDistribution.positive || 0, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: data?.sentimentDistribution.neutral || 0, color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: data?.sentimentDistribution.negative || 0, color: SENTIMENT_COLORS.negative }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 dark:text-gray-400">Loading product insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
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
                onClick={() => window.history.back()}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                ← Back to {brandName}
              </button>
              <div>
                <h1 className="text-2xl font-mono font-bold text-emerald-400">{productName}</h1>
                <p className="text-sm text-gray-400">Product Analysis for {brandName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs font-mono text-emerald-400">
                PRODUCT MODE
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Keywords Display */}
      <div className="container mx-auto px-6 py-4">
        <div className="bg-gray-900/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-800/50 dark:border-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-mono text-gray-400 mb-2">Tracking Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {productKeywords.map((keyword, index) => (
              <span key={index} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-mono">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Volume Card */}
          <div className="relative bg-gray-900/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-800/50 dark:border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 dark:hover:border-gray-700/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-mono text-gray-500 dark:text-gray-500 uppercase tracking-wider">Volume</span>
            </div>
            <div className="text-3xl font-bold text-white dark:text-white mb-2">
              {data?.totalMentions.toLocaleString()}
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-400">Product Mentions</p>
          </div>

          {/* Sentiment Score Card */}
          <div className="relative bg-gray-900/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-800/50 dark:border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 dark:hover:border-gray-700/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-mono text-gray-500 dark:text-gray-500 uppercase tracking-wider">Sentiment</span>
            </div>
            <div className={`text-3xl font-bold ${getSentimentColor(data?.avgSentiment || 50)}`}>
              {data && data.avgSentiment > 0 ? '+' : ''}{data?.avgSentiment.toFixed(1)}
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-400">Average Score</p>
          </div>

          {/* Keywords Match Card */}
          <div className="relative bg-gray-900/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-800/50 dark:border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 dark:hover:border-gray-700/50 transition-all duration-300 hover:transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              <span className="text-xs font-mono text-gray-500 dark:text-gray-500 uppercase tracking-wider">Keywords</span>
            </div>
            <div className="text-3xl font-bold text-white dark:text-white mb-2">
              {productKeywords.length}
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-400">Active Keywords</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Sentiment Distribution */}
          <div className="bg-gray-900/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-800/50 dark:border-gray-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white dark:text-white mb-4">Sentiment Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Sentiment Trend */}
          <div className="bg-gray-900/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-800/50 dark:border-gray-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white dark:text-white mb-4">Sentiment Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af' }}
                  domain={[0, 100]}
                />
                <Area 
                  type="monotone" 
                  dataKey="sentiment" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3}
                />
                <Tooltip />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Mentions */}
        <div className="bg-gray-900/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-800/50 dark:border-gray-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white dark:text-white mb-4">Recent Product Mentions</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data?.recentMentions.map((mention) => (
              <div key={mention.id} className="border border-gray-800/50 dark:border-gray-800/50 rounded-lg p-4 hover:border-white/10 dark:hover:border-white/10 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">{mention.author}</span>
                    <Clock className="w-4 h-4 text-gray-400 ml-2" />
                    <span className="text-sm text-gray-400">
                      {new Date(mention.posted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-mono ${
                    mention.sentiment >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                    mention.sentiment >= 40 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {mention.sentiment > 0 ? '+' : ''}{mention.sentiment.toFixed(1)}%
                  </div>
                </div>
                <p className="text-gray-300 dark:text-gray-300 text-sm mb-2">{mention.text}</p>
                <div className="text-xs text-gray-500">
                  Confidence: {(mention.confidence * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
