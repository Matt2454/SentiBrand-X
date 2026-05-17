import { createSupabaseClient } from '../lib/supabase';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function verifySeeding() {
  console.log('🔍 Verifying MEGA SEEDING results...\n');
  
  const supabase = createSupabaseClient();
  
  try {
    // Check total brand mentions
    const { count: mentionsCount, error: mentionsError } = await supabase
      .from('brand_mentions')
      .select('*', { count: 'exact', head: true });
    
    if (mentionsError) {
      console.error('❌ Error counting mentions:', mentionsError);
      return;
    }
    
    console.log(`📊 Brand Mentions: ${mentionsCount?.toLocaleString() || 0}`);
    
    // Check total sentiment analyses
    const { count: sentimentCount, error: sentimentError } = await supabase
      .from('sentiment_analyses')
      .select('*', { count: 'exact', head: true });
    
    if (sentimentError) {
      console.error('❌ Error counting sentiments:', sentimentError);
      return;
    }
    
    console.log(`🧠 Sentiment Analyses: ${sentimentCount?.toLocaleString() || 0}`);
    
    // Check unique brands
    const { data: brands, error: brandsError } = await supabase
      .from('brand_mentions')
      .select('brand')
      .neq('brand', null);
    
    if (brandsError) {
      console.error('❌ Error getting brands:', brandsError);
      return;
    }
    
    const uniqueBrands = [...new Set(brands?.map(b => b.brand) || [])];
    console.log(`🏢 Unique Brands: ${uniqueBrands.length}`);
    console.log(`   ${uniqueBrands.join(', ')}`);
    
    // Check sentiment distribution
    const { data: sentimentDist, error: distError } = await supabase
      .from('sentiment_analyses')
      .select('sentiment_label')
      .neq('sentiment_label', null);
    
    if (distError) {
      console.error('❌ Error getting sentiment distribution:', distError);
      return;
    }
    
    const distribution = sentimentDist?.reduce((acc, curr) => {
      acc[curr.sentiment_label] = (acc[curr.sentiment_label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    console.log('\n📈 Sentiment Distribution:');
    Object.entries(distribution).forEach(([sentiment, count]) => {
      const percentage = ((count / (sentimentCount || 1)) * 100).toFixed(1);
      console.log(`   ${sentiment}: ${count.toLocaleString()} (${percentage}%)`);
    });
    
    // Check date range
    const { data: dateRange, error: dateError } = await supabase
      .from('brand_mentions')
      .select('posted_at')
      .order('posted_at', { ascending: true })
      .limit(1);
    
    const { data: dateRangeEnd, error: dateErrorEnd } = await supabase
      .from('brand_mentions')
      .select('posted_at')
      .order('posted_at', { ascending: false })
      .limit(1);
    
    if (!dateError && !dateErrorEnd && dateRange?.[0] && dateRangeEnd?.[0]) {
      console.log(`\n📅 Date Range: ${dateRange[0].posted_at?.split('T')[0]} to ${dateRangeEnd[0].posted_at?.split('T')[0]}`);
    }
    
    // Sample some recent tweets
    const { data: samples, error: sampleError } = await supabase
      .from('brand_mentions')
      .select('brand, raw_text, posted_at, author_handle')
      .order('posted_at', { ascending: false })
      .limit(5);
    
    if (!sampleError && samples) {
      console.log('\n🐦 Sample Recent Tweets:');
      samples.forEach((sample, i) => {
        console.log(`\n${i + 1}. ${sample.brand} - @${sample.author_handle}`);
        console.log(`   "${sample.raw_text.substring(0, 100)}${sample.raw_text.length > 100 ? '...' : ''}"`);
        console.log(`   ${sample.posted_at}`);
      });
    }
    
    console.log('\n✅ VERIFICATION COMPLETE!');
    
  } catch (error) {
    console.error('💀 Verification failed:', error);
  }
}

verifySeeding();
