import { createSupabaseClient } from '../lib/supabase';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// AI relevance filtering (copied from megaSeedChaos.ts)
async function isTweetRelevantToBrand(brand: string, tweetText: string): Promise<boolean> {
  try {
    const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
    const response = await fetch(`https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `Is this tweet genuinely about the brand "${brand}"? Tweet: "${tweetText}". Answer only "yes" or "no".`,
        parameters: {
          max_new_tokens: 10,
          temperature: 0.1,
        }
      })
    });

    if (!response.ok) {
      // Fallback: simple keyword matching if AI fails
      return tweetText.toLowerCase().includes(brand.toLowerCase()) ||
             tweetText.toLowerCase().includes(brand.toLowerCase().replace(/\s+/g, ''));
    }

    const result = await response.json();
    const generatedText = result[0]?.generated_text?.toLowerCase().trim() || '';
    
    return generatedText.includes('yes');
  } catch (error) {
    // Fallback: simple keyword matching
    console.log(`⚠️ AI relevance check failed for ${brand}, using fallback`);
    return tweetText.toLowerCase().includes(brand.toLowerCase()) ||
           tweetText.toLowerCase().includes(brand.toLowerCase().replace(/\s+/g, ''));
  }
}

async function cleanupExistingData() {
  console.log('🧹 Cleaning up existing data with AI relevance filtering...\n');
  
  const supabase = createSupabaseClient();
  
  // Get all brands that have tweets
  const { data: brands, error: brandsError } = await supabase
    .from('brand_mentions')
    .select('brand')
    .not('brand', 'is', null)
    .order('brand');
  
  if (brandsError) {
    console.error('❌ Error fetching brands:', brandsError);
    return;
  }
  
  const uniqueBrands = [...new Set((brands || []).map(b => b.brand))];
  console.log(`📊 Found ${uniqueBrands.length} brands to check`);
  
  let totalChecked = 0;
  let totalCleaned = 0;
  
  for (const brand of uniqueBrands) {
    console.log(`\n🔍 Processing brand: ${brand}`);
    
    // Get all tweets for this brand
    const { data: tweets, error: tweetsError } = await supabase
      .from('brand_mentions')
      .select('id, raw_text')
      .eq('brand', brand);
    
    if (tweetsError) {
      console.error(`❌ Error fetching ${brand} tweets:`, tweetsError);
      continue;
    }
    
    console.log(`📊 Checking ${tweets?.length || 0} tweets for ${brand}`);
    
    let brandCleaned = 0;
    
    for (const tweet of tweets || []) {
      totalChecked++;
      
      // Check if tweet is actually relevant
      const isRelevant = await isTweetRelevantToBrand(brand, tweet.raw_text);
      
      if (!isRelevant) {
        // Remove brand assignment (set to null)
        const { error: updateError } = await supabase
          .from('brand_mentions')
          .update({ brand: null })
          .eq('id', tweet.id);
        
        if (updateError) {
          console.error(`❌ Error updating tweet ${tweet.id}:`, updateError);
        } else {
          brandCleaned++;
          totalCleaned++;
          
          // Show examples of cleaned tweets
          if (brandCleaned <= 3) {
            console.log(`   🚫 Cleaned: "${tweet.raw_text.substring(0, 60)}..."`);
          }
        }
      }
    }
    
    console.log(`✅ ${brand}: Cleaned ${brandCleaned} irrelevant tweets`);
  }
  
  console.log(`\n🎯 Cleanup Summary:`);
  console.log(`   📊 Total tweets checked: ${totalChecked}`);
  console.log(`   🧹 Total tweets cleaned: ${totalCleaned}`);
  console.log(`   📈 Clean rate: ${((totalCleaned / totalChecked) * 100).toFixed(1)}%`);
  
  console.log('\n💡 Brand feeds should now be much cleaner!');
}

cleanupExistingData();
