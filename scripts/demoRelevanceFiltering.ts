import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// AI relevance filtering
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
      console.log(`⚠️ AI failed, using fallback`);
      return tweetText.toLowerCase().includes(brand.toLowerCase());
    }

    const result = await response.json();
    const generatedText = result[0]?.generated_text?.toLowerCase().trim() || '';
    
    return generatedText.includes('yes');
  } catch (error) {
    console.log(`⚠️ AI failed, using fallback`);
    return tweetText.toLowerCase().includes(brand.toLowerCase());
  }
}

async function demoRelevanceFiltering() {
  console.log('🧪 Demo: AI Relevance Filtering\n');
  
  const testCases = [
    {
      brand: 'AMD',
      tweets: [
        'AMD Ryzen 9 processor is amazing for gaming!',
        'CHECK OUT MY CRYPTO PROJECT FOR MASSIVE GAINS!!! 💰💰',
        'my cat knocked over my coffee this morning',
        'AMD stock price is up after earnings report'
      ]
    },
    {
      brand: 'Apple', 
      tweets: [
        'Apple iPhone 15 camera is incredible',
        '🚀 GUADAGNA 1000$ AL GIORNO CON I CRYPTO-BOT!!!',
        'thinking about getting a new plant for my apartment',
        'Apple Watch Series 10 launch day is here!!! SO HYPED!!!'
      ]
    }
  ];
  
  for (const { brand, tweets } of testCases) {
    console.log(`\n🔍 Testing brand: ${brand}`);
    console.log('=' .repeat(50));
    
    for (const tweet of tweets) {
      console.log(`\n📝 Tweet: "${tweet}"`);
      
      const isRelevant = await isTweetRelevantToBrand(brand, tweet);
      
      if (isRelevant) {
        console.log(`✅ AI says: RELEVANT → Assign to ${brand}`);
      } else {
        console.log(`🚫 AI says: NOT RELEVANT → Store with null brand`);
      }
    }
  }
  
  console.log('\n🎯 Demo complete!');
  console.log('\n💡 This shows how the AI will filter spam/irrelevant content');
  console.log('   while keeping genuinely relevant tweets in brand feeds.');
}

demoRelevanceFiltering();
