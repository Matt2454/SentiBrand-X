import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";

config({ path: path.resolve(process.cwd(), ".env.local") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugDatabase() {
  console.log("🔍 Debugging database structure and data...");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Missing Supabase credentials.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // 1. Check total mentions
    console.log("\n📊 Checking brand_mentions...");
    const { data: mentions, error: mentionError } = await supabase
      .from("brand_mentions")
      .select("id, external_id, brand, author_handle, posted_at")
      .limit(5);

    if (mentionError) {
      console.error("❌ Error fetching mentions:", mentionError);
    } else {
      console.log("✅ Sample mentions:");
      mentions?.forEach(m => {
        console.log(`  - ID: ${m.id}, External: ${m.external_id}, Brand: ${m.brand}, Author: ${m.author_handle}`);
      });
    }

    // 2. Check total mentions count
    const { count: totalMentions, error: countError } = await supabase
      .from("brand_mentions")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Error counting mentions:", countError);
    } else {
      console.log(`📈 Total mentions: ${totalMentions}`);
    }

    // 3. Check sentiment analyses
    console.log("\n🧠 Checking sentiment_analyses...");
    const { data: analyses, error: analysisError } = await supabase
      .from("sentiment_analyses")
      .select("id, mention_id, sentiment_label, model_name")
      .limit(5);

    if (analysisError) {
      console.error("❌ Error fetching analyses:", analysisError);
    } else {
      console.log("✅ Sample analyses:");
      analyses?.forEach(a => {
        console.log(`  - ID: ${a.id}, Mention ID: ${a.mention_id}, Sentiment: ${a.sentiment_label}, Model: ${a.model_name}`);
      });
    }

    // 4. Check total analyses count
    const { count: totalAnalyses, error: analysisCountError } = await supabase
      .from("sentiment_analyses")
      .select("*", { count: "exact", head: true });

    if (analysisCountError) {
      console.error("❌ Error counting analyses:", analysisCountError);
    } else {
      console.log(`📈 Total analyses: ${totalAnalyses}`);
    }

    // 5. Test the JOIN query (same as dashboard)
    console.log("\n🔗 Testing dashboard JOIN query...");
    
    // Get mentions first
    const { data: dashboardMentions, error: dashboardMentionError } = await supabase
      .from("brand_mentions")
      .select("id, brand")
      .ilike("brand", "%%")
      .limit(10);

    if (dashboardMentionError) {
      console.error("❌ Dashboard mentions error:", dashboardMentionError);
    } else {
      const mentionIds = dashboardMentions?.map((item) => item.id) || [];
      console.log(`🔑 Mention IDs from dashboard query: ${mentionIds.slice(0, 5)}...`);

      if (mentionIds.length > 0) {
        const { data: dashboardAnalyses, error: dashboardAnalysisError } = await supabase
          .from("sentiment_analyses")
          .select("sentiment_label, created_at, mention_id")
          .in("mention_id", mentionIds);

        if (dashboardAnalysisError) {
          console.error("❌ Dashboard analyses error:", dashboardAnalysisError);
        } else {
          console.log(`✅ Dashboard JOIN found ${dashboardAnalyses?.length || 0} analyses for ${mentionIds.length} mentions`);
          
          // Check if mention_ids match
          const foundMentionIds = dashboardAnalyses?.map(a => a.mention_id) || [];
          const missingMentionIds = mentionIds.filter(id => !foundMentionIds.includes(id));
          
          if (missingMentionIds.length > 0) {
            console.log(`⚠️ Missing analyses for mention IDs: ${missingMentionIds.slice(0, 5)}...`);
          }
        }
      }
    }

    // 6. Check for data in the last 7 days
    console.log("\n📅 Checking data from last 7 days...");
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentMentions, error: recentError } = await supabase
      .from("brand_mentions")
      .select("id, posted_at")
      .gte("posted_at", sevenDaysAgo.toISOString());

    if (recentError) {
      console.error("❌ Error fetching recent mentions:", recentError);
    } else {
      console.log(`📈 Mentions from last 7 days: ${recentMentions?.length || 0}`);
    }

    console.log("\n🎯 Debug complete! Check the output above to identify issues.");

  } catch (error) {
    console.error("❌ Debug error:", error);
  }
}

debugDatabase().catch((error) => {
  console.error("❌ Debug failed:", error);
  process.exit(1);
});
