import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Improved AI relevance filtering (copied from megaSeedChaos.ts)
async function isTweetRelevantToBrand(brand: string, tweetText: string): Promise<boolean> {
  // First, check for obvious spam patterns
  const spamPatterns = [
    /GIVEAWAY/i,
    /CLICK HERE/i,
    /FREE.*\w+/i,
    /CRYPTO/i,
    /BITCOIN/i,
    /MASSIVE GAINS/i,
    /GET RICH/i,
    /TRADING SIGNALS/i,
    /GUADAGNA/i,
    /LINK IN BIO/i,
    /DM FOR/i,
    /\d+%\s*(OFF|DISCOUNT)/i,
    /WIN.*\w+/i
  ];
  
  const isSpam = spamPatterns.some(pattern => pattern.test(tweetText));
  if (isSpam) {
    return false; // Immediately reject spam
  }
  
  // Check for emoji-only or emoji-heavy content
  const emojiCount = (tweetText.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
  const wordCount = tweetText.split(/\s+/).filter(word => word.length > 0).length;
  if (wordCount < 5 || emojiCount > wordCount) {
    return false; // Reject emoji-only or emoji-heavy spam
  }
  
  try {
    const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
    const response = await fetch(`https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `Is this tweet genuinely about the brand "${brand}" in a meaningful way? Tweet: "${tweetText}". Answer only "yes" or "no". Ignore spam, giveaways, or promotional content.`,
        parameters: {
          max_new_tokens: 10,
          temperature: 0.1,
        }
      })
    });

    if (!response.ok) {
      // Fallback: stricter keyword matching if AI fails
      const brandLower = brand.toLowerCase();
      const textLower = tweetText.toLowerCase();
      
      // Must contain brand name AND meaningful context
      const hasBrand = textLower.includes(brandLower);
      const hasContext = /\b(product|service|buy|purchase|use|love|hate|issue|problem|good|bad|amazing|terrible|customer|support|price|quality|feature|launch|update|news|stock|ceo|company|camera|processor|phone|laptop|computer|amazing|incredible|great|awesome|best|worst|helped|fixed|broke|working|performance|experience|review|opinion|think|feel)\b/i.test(textLower);
      
      return hasBrand && hasContext;
    }

    const result = await response.json();
    const generatedText = result[0]?.generated_text?.toLowerCase().trim() || '';
    
    return generatedText.includes('yes');
  } catch (error) {
    // Fallback: stricter keyword matching
    console.log(`⚠️ AI relevance check failed for ${brand}, using strict fallback`);
    const brandLower = brand.toLowerCase();
    const textLower = tweetText.toLowerCase();
    
    // Must contain brand name AND meaningful context
    const hasBrand = textLower.includes(brandLower);
    const hasContext = /\b(product|service|buy|purchase|use|love|hate|issue|problem|good|bad|amazing|terrible|customer|support|price|quality|feature|launch|update|news|stock|ceo|company|camera|processor|phone|laptop|computer|amazing|incredible|great|awesome|best|worst|helped|fixed|broke|working|performance|experience|review|opinion|think|feel)\b/i.test(textLower);
    
    return hasBrand && hasContext;
  }
}

async function testImprovedFiltering() {
  console.log('🧪 Testing Improved AI Relevance Filtering\n');
  
  const testCases = [
    {
      brand: 'Apple',
      tweets: [
        'Apple GIVEAWAY!!! CLICK HERE FOR FREE iPad Air!!! 🎁 🔥 💀 #tech #review', // Should be REJECTED
        'Apple iPhone 15 camera is incredible for photography', // Should be ACCEPTED  
        'Just bought Apple MacBook Pro and it\'s amazing for my work', // Should be ACCEPTED
        '🚀 GUADAGNA 1000$ AL GIORNO CON I CRYPTO-BOT!!! Apple LINK IN BIO 🚀', // Should be REJECTED
        'Apple stock price is up after earnings report', // Should be ACCEPTED
        '💀💀💀', // Should be REJECTED (emoji only)
        'Apple customer service helped me with my issue', // Should be ACCEPTED
        'WIN FREE Apple iPhone!!! CLICK HERE NOW!!!', // Should be REJECTED
      ]
    },
    {
      brand: 'AMD',
      tweets: [
        'AMD Ryzen 9 processor is amazing for gaming', // Should be ACCEPTED
        'AMD GIVEAWAY!!! CLICK HERE FOR FREE Ryzen 9000!!! 🎁', // Should be REJECTED
        'TRADING SIGNALS FOR Bitcoin!!! AMD GET RICH QUICK!!!', // Should be REJECTED
        'AMD CEO announced new processor lineup', // Should be ACCEPTED
        'my cat knocked over my coffee this morning', // Should be REJECTED (no AMD mention)
        'AMD quality control issues with Radeon cards', // Should be ACCEPTED
        '🎯🎯🎯 🔥 💀 #tech #review', // Should be REJECTED (emoji spam)
      ]
    }
  ];
  
  for (const { brand, tweets } of testCases) {
    console.log(`\n🔍 Testing brand: ${brand}`);
    console.log('=' .repeat(60));
    
    for (const tweet of tweets) {
      console.log(`\n📝 Tweet: "${tweet}"`);
      
      const isRelevant = await isTweetRelevantToBrand(brand, tweet);
      
      if (isRelevant) {
        console.log(`✅ PASSED: Relevant → Assign to ${brand}`);
      } else {
        console.log(`🚫 FILTERED: Not relevant/Spam → Route to unassigned`);
      }
    }
  }
  
  console.log('\n🎯 Improved filtering test complete!');
  console.log('\n💡 The filter should now catch:');
  console.log('   ✅ Giveaway spam');
  console.log('   ✅ Crypto spam'); 
  console.log('   ✅ Emoji-only content');
  console.log('   ✅ Promotional spam');
  console.log('   ✅ But keep genuine brand mentions');
}

testImprovedFiltering();
