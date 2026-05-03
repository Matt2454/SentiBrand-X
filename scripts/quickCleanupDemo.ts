import { createSupabaseClient } from '../lib/supabase';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function quickCleanupDemo() {
  console.log('🧹 Quick Demo: Manual cleanup of obvious spam\n');
  
  const supabase = createSupabaseClient();
  
  // Find obvious crypto spam tweets
  const spamKeywords = ['CRYPTO', 'BITCOIN', 'GUADAGNA', 'MASSIVE GAINS', 'GIVEAWAY'];
  
  for (const keyword of spamKeywords) {
    console.log(`\n🔍 Looking for tweets containing: "${keyword}"`);
    
    const { data: spamTweets, error: spamError } = await supabase
      .from('brand_mentions')
      .select('id, brand, raw_text')
      .ilike('raw_text', `%${keyword}%`)
      .not('brand', 'is', null)
      .limit(5); // Just 5 examples per keyword
    
    if (spamError) {
      console.error(`❌ Error:`, spamError);
      continue;
    }
    
    if (spamTweets && spamTweets.length > 0) {
      console.log(`📊 Found ${spamTweets.length} spam tweets`);
      
      for (const tweet of spamTweets) {
        console.log(`   🚫 ${tweet.brand}: "${tweet.raw_text.substring(0, 60)}..."`);
        
        // Remove brand assignment (set to "unassigned")
        const { error: updateError } = await supabase
          .from('brand_mentions')
          .update({ brand: 'unassigned' })
          .eq('id', tweet.id);
        
        if (updateError) {
          console.error(`❌ Failed to update:`, updateError);
        } else {
          console.log(`   ✅ Cleaned!`);
        }
      }
    } else {
      console.log(`   ✅ No spam found with "${keyword}"`);
    }
  }
  
  console.log('\n🎯 Demo cleanup complete!');
  console.log('\n💡 Check the brand pages now - they should be cleaner!');
  console.log('   Try: http://localhost:3000/brand/AMD');
  console.log('   Try: http://localhost:3000/brand/Apple');
}

quickCleanupDemo();
