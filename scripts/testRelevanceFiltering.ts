import { createSupabaseClient } from '../lib/supabase';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function testRelevanceFiltering() {
  console.log('🧪 Testing AI relevance filtering...\n');
  
  const supabase = createSupabaseClient();
  
  // Test brands to check
  const testBrands = ['AMD', 'Apple', 'Tesla'];
  
  for (const brand of testBrands) {
    console.log(`\n🔍 Checking brand: ${brand}`);
    
    try {
      // Get all tweets for this brand
      const { data: brandTweets, error: brandError } = await supabase
        .from('brand_mentions')
        .select('brand, raw_text')
        .eq('brand', brand)
        .limit(20);
      
      if (brandError) {
        console.log(`❌ Error fetching ${brand} tweets:`, brandError);
        continue;
      }
      
      console.log(`📊 Found ${brandTweets?.length || 0} tweets for ${brand}`);
      
      // Check for obvious spam/irrelevant content
      const spamKeywords = ['CRYPTO', 'BITCOIN', 'GIVEAWAY', 'CLICK HERE', 'GET RICH', 'MASSIVE GAINS'];
      const irrelevantKeywords = ['cat', 'coffee', 'weather', 'lunch', 'laundry', 'keys'];
      
      let spamCount = 0;
      let irrelevantCount = 0;
      let relevantCount = 0;
      
      brandTweets?.forEach((tweet, index) => {
        const text = tweet.raw_text.toUpperCase();
        const hasSpam = spamKeywords.some(keyword => text.includes(keyword));
        const hasIrrelevant = irrelevantKeywords.some(keyword => text.includes(keyword));
        
        if (hasSpam) {
          spamCount++;
          console.log(`   ❌ SPAM (${index + 1}): "${tweet.raw_text.substring(0, 80)}..."`);
        } else if (hasIrrelevant) {
          irrelevantCount++;
          console.log(`   🤔 IRRELEVANT (${index + 1}): "${tweet.raw_text.substring(0, 80)}..."`);
        } else {
          relevantCount++;
          if (index < 3) { // Show first few relevant examples
            console.log(`   ✅ RELEVANT (${index + 1}): "${tweet.raw_text.substring(0, 80)}..."`);
          }
        }
      });
      
      console.log(`\n📈 ${brand} Summary:`);
      console.log(`   ✅ Relevant: ${relevantCount}`);
      console.log(`   ❌ Spam: ${spamCount}`);
      console.log(`   🤔 Irrelevant: ${irrelevantCount}`);
      console.log(`   🎯 Relevance Rate: ${((relevantCount / (brandTweets?.length || 1)) * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.log(`❌ Error testing ${brand}:`, error);
    }
  }
  
  // Also check for unassigned tweets (should have spam/irrelevant content)
  console.log('\n🔍 Checking unassigned tweets (brand = null)...');
  
  try {
    const { data: nullBrandTweets, error: nullError } = await supabase
      .from('brand_mentions')
      .select('raw_text')
      .is('brand', null)
      .limit(10);
    
    if (nullError) {
      console.log('❌ Error fetching unassigned tweets:', nullError);
    } else {
      console.log(`📊 Found ${nullBrandTweets?.length || 0} unassigned tweets`);
      nullBrandTweets?.forEach((tweet, index) => {
        console.log(`   🚫 Unassigned (${index + 1}): "${tweet.raw_text.substring(0, 80)}..."`);
      });
    }
  } catch (error) {
    console.log('❌ Error checking unassigned tweets:', error);
  }
  
  console.log('\n🎯 Relevance filtering test complete!');
  console.log('\n💡 If you see spam in brand feeds, the AI filtering needs improvement.');
  console.log('   If unassigned tweets contain relevant content, the AI is too strict.');
}

testRelevanceFiltering();
