import { createSupabaseClient } from '../lib/supabase';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function checkDashboardFix() {
  console.log('🔍 Checking if dashboard fix is working...\n');
  
  const supabase = createSupabaseClient();
  
  try {
    // Get total count (same query as dashboard)
    const { count: totalCount, error: countError } = await supabase
      .from("brand_mentions")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error('❌ Count query error:', countError);
      return;
    }

    console.log(`📊 Total mentions in database: ${totalCount?.toLocaleString() || 0}`);
    
    // Get recent mentions (same query as dashboard)
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 7); // 7 days like dashboard default
    
    const { data: recentMentions, error: mentionsError } = await supabase
      .from("brand_mentions")
      .select("id, brand, posted_at")
      .gte("posted_at", startDate.toISOString())
      .lte("posted_at", now.toISOString());

    if (mentionsError) {
      console.error('❌ Mentions query error:', mentionsError);
      return;
    }

    console.log(`📈 Recent mentions (last 7 days): ${recentMentions?.length || 0}`);
    
    // Get sentiment analyses (same query as dashboard)
    const mentionIds = recentMentions?.map(m => m.id) || [];
    
    if (mentionIds.length > 0) {
      const { data: allAnalyses, error: analysesError } = await supabase
        .from("sentiment_analyses")
        .select("*");

      if (analysesError) {
        console.error('❌ Analyses query error:', analysesError);
        return;
      }

      console.log(`🧠 Total sentiment analyses: ${allAnalyses?.length || 0}`);
      
      // Filter analyses client-side (same as dashboard)
      const filteredAnalyses = allAnalyses?.filter(analysis => mentionIds.includes(analysis.mention_id)) || [];
      console.log(`🎯 Filtered analyses for recent mentions: ${filteredAnalyses.length}`);
    }
    
    console.log('\n✅ Dashboard should now show:');
    console.log(`   📊 Total Mentions: ${totalCount?.toLocaleString() || 0} (NOT the old 1000 limit!)`);
    console.log(`   📈 Recent Activity: ${recentMentions?.length || 0} mentions in last 7 days`);
    
  } catch (error) {
    console.error('💀 Check failed:', error);
  }
}

checkDashboardFix();
