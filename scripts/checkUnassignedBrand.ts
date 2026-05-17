import { createSupabaseClient } from '../lib/supabase';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function checkUnassignedBrand() {
  console.log('🔍 Checking "unassigned" brand for cleaned spam...\n');
  
  const supabase = createSupabaseClient();
  
  try {
    const { data: unassignedTweets, error: unassignedError } = await supabase
      .from('brand_mentions')
      .select('raw_text')
      .eq('brand', 'unassigned')
      .limit(20);
    
    if (unassignedError) {
      console.error('❌ Error fetching unassigned tweets:', unassignedError);
      return;
    }
    
    console.log(`📊 Found ${unassignedTweets?.length || 0} unassigned tweets`);
    
    const spamKeywords = ['CRYPTO', 'BITCOIN', 'GUADAGNA', 'MASSIVE GAINS', 'GIVEAWAY'];
    
    unassignedTweets?.forEach((tweet, index) => {
      const text = tweet.raw_text;
      const isSpam = spamKeywords.some(keyword => text.toUpperCase().includes(keyword));
      
      if (isSpam) {
        console.log(`   🚫 SPAM (${index + 1}): "${text.substring(0, 80)}..."`);
      } else {
        console.log(`   🤔 OTHER (${index + 1}): "${text.substring(0, 80)}..."`);
      }
    });
    
    // Now check a specific brand to see if it's cleaner
    console.log('\n🔍 Checking AMD brand after cleanup...');
    
    const { data: amdTweets, error: amdError } = await supabase
      .from('brand_mentions')
      .select('raw_text')
      .eq('brand', 'AMD')
      .limit(10);
    
    if (amdError) {
      console.error('❌ Error fetching AMD tweets:', amdError);
      return;
    }
    
    console.log(`📊 Found ${amdTweets?.length || 0} AMD tweets`);
    
    amdTweets?.forEach((tweet, index) => {
      const text = tweet.raw_text;
      const isSpam = spamKeywords.some(keyword => text.toUpperCase().includes(keyword));
      
      if (isSpam) {
        console.log(`   ❌ STILL SPAM (${index + 1}): "${text.substring(0, 80)}..."`);
      } else {
        console.log(`   ✅ CLEAN (${index + 1}): "${text.substring(0, 80)}..."`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n🎯 Check complete!');
  console.log('\n💡 If unassigned brand has spam and AMD brand is cleaner, the cleanup worked!');
}

checkUnassignedBrand();
