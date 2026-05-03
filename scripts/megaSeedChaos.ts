import { createClient } from '@supabase/supabase-js';
import { createSupabaseClient } from '../lib/supabase';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// HuggingFace API for AI-generated categories
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';

// Language configurations
const LANGUAGES = {
  en: { name: 'English', weight: 0.4 },
  es: { name: 'Spanish', weight: 0.15 },
  it: { name: 'Italian', weight: 0.15 },
  fr: { name: 'French', weight: 0.1 },
  de: { name: 'German', weight: 0.08 },
  ja: { name: 'Japanese', weight: 0.07 },
  pt: { name: 'Portuguese', weight: 0.05 }
};

// Tweet patterns for maximum chaos
const TWEET_PATTERNS = {
  normal: [
    "Just got {product} and it's amazing! {feature}",
    "Having issues with {product}. {complaint}",
    "{product} is {opinion} but {condition}",
    "Customer service for {brand} is {quality}",
    "The new {product} launch is {sentiment}",
    "Thinking about switching to {competitor} because of {reason}",
    "{brand} stock price is {trend} after {event}",
    "Installation of {product} took {time} and {result}",
    "Performance comparison: {product1} vs {product2} - {winner}",
    "{brand} just announced {announcement}. {reaction}"
  ],
  
  sarcastic: [
    "Oh yeah {brand} is PERFECT, only {negative_event} {frequency} today 🙃",
    "Love when {product} {negative_action} right after I {action} 💀",
    "Another day, another {brand} {issue}. So reliable! 🙃",
    "Wow {brand} really outdid themselves this time. {product} is {sarcastic_praise}",
    "Great job {brand}, charging {price} for {feature} that should be free 🙃",
    "{brand} support is absolutely useless. Waited {time} for {simple_task} 😭",
    "Oh wonderful, {product} {negative_action} again. Best purchase ever! 🙃"
  ],
  
  spam: [
    "🚀 GUADAGNA 1000$ AL GIORNO CON I CRYPTO-BOT!!! LINK IN BIO 🚀",
    "CHECK OUT MY CRYPTO PROJECT FOR MASSIVE GAINS!!! 💰💰",
    "EARN MONEY ONLINE WITH MY SYSTEM!!! DM FOR INFO 💸",
    "{brand} GIVEAWAY!!! CLICK HERE FOR FREE {product}!!! 🎁",
    "TRADING SIGNALS FOR {crypto}!!! GET RICH QUICK!!! 🔥📈"
  ],
  
  emojiOnly: [
    "💀💀💀",
    "🔥🔥🔥",
    "🚀🚀🚀",
    "💎💎💎",
    "⚡⚡⚡",
    "🌟🌟🌟",
    "💯💯💯",
    "🎯🎯🎯"
  ],
  
  irrelevant: [
    "my cat knocked over my coffee this morning",
    "just saw a weird cloud outside my window",
    "thinking about getting a new plant for my apartment",
    "the weather is nice today I guess",
    "what should I have for lunch today",
    "my neighbor is playing loud music again",
    "lost my keys somewhere in this house",
    "need to do laundry soon",
    "wonder if my package will arrive today",
    "the birds are chirping loudly this morning"
  ],
  
  news: [
    "BREAKING: {brand} announces {product} - {details}",
    "{brand} stock {trend} after {event} report",
    "Industry sources: {brand} planning {announcement}",
    "Market analysis: {brand} vs {competitor} - {insight}",
    "SEC filing reveals {brand} {strategy} for {timeframe}",
    "Analyst upgrade: {brand} to {rating}",
    "{brand} CEO {action} regarding {topic}",
    "Supply chain issues affecting {brand} {product} production"
  ],
  
  complaints: [
    "@{brand} support has been useless for {time}. {issue}",
    "My {product} broke after {duration}. {brand} won't help.",
    "Waited {wait_time} for {service} from {brand}. Still nothing.",
    "{brand} quality control is getting worse. {product} has {defect}",
    "Paid {price} for {product} and it's {problem}. Disappointed.",
    "Multiple {component} failures on {product}. {brand} support clueless."
  ],
  
  hype: [
    "JUST BOUGHT {product} LETS GOOO!!! 🔥🔥",
    "{product} launch day is here!!! SO HYPED!!! 🚀",
    "Can't wait to get my hands on {product}!!! 💯",
    "{brand} is changing the game with {product}!!! 🎯",
    "The future is {product}!!! {brand} wins again!!! 🏆",
    "Finally!!! {product} in stock!!! GET IT NOW!!! 🏃"
  ]
};

// Real brands + fake brands for testing
const BRANDS = [
  'AMD', 'Apple', 'Tesla', 'Nike', 'Samsung', 'Mercedes', 'Starbucks', 'Oracle', 'Amazon', 'Pepsi',
  'TechCorp', 'Global Industries', 'Innovate LLC', 'MegaBrand', 'StartupX', 'CloudNine', 'DataFlow'
];

// AI-generated brand categories
interface BrandCategory {
  brand: string;
  products: string[];
  services: string[];
  competitors: string[];
}

// AI relevance filtering
async function isTweetRelevantToBrand(brand: string, tweetText: string): Promise<boolean> {
  try {
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

async function generateBrandCategories(brandName: string): Promise<BrandCategory> {
  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `Generate realistic product categories and services for the brand "${brandName}". Return a JSON object with: products (array of product names), services (array of service names), competitors (array of competitor brands). Be specific to this brand's industry.`,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      console.log(`⚠️ HuggingFace API failed for ${brandName}, using fallback`);
      return generateFallbackCategories(brandName);
    }

    const result = await response.json();
    const generatedText = result[0]?.generated_text || '';
    
    try {
      const categories = JSON.parse(generatedText);
      console.log(`✅ AI-generated categories for ${brandName}:`, categories);
      return categories;
    } catch (parseError) {
      console.log(`⚠️ Failed to parse AI response for ${brandName}, using fallback`);
      return generateFallbackCategories(brandName);
    }
  } catch (error) {
    console.log(`⚠️ HuggingFace API error for ${brandName}:`, error);
    return generateFallbackCategories(brandName);
  }
}

function generateFallbackCategories(brandName: string): BrandCategory {
  const fallbacks: Record<string, BrandCategory> = {
    'AMD': {
      brand: 'AMD',
      products: ['Ryzen 9000', 'Radeon RX 7900', 'Ryzen 7000', 'Threadripper 7950X'],
      services: ['AMD Support', 'AMD Driver Updates', 'AMD Rewards'],
      competitors: ['Intel', 'NVIDIA']
    },
    'Apple': {
      brand: 'Apple',
      products: ['iPhone 16', 'MacBook Pro', 'iPad Air', 'Apple Watch Series 10'],
      services: ['Apple Support', 'iCloud', 'Apple Music'],
      competitors: ['Samsung', 'Google', 'Microsoft']
    },
    'Tesla': {
      brand: 'Tesla',
      products: ['Model 3 Highland', 'Model S Plaid', 'Cybertruck', 'Powerwall'],
      services: ['Tesla Support', 'Supercharger Network', 'Autopilot'],
      competitors: ['Ford', 'GM', 'Rivian']
    },
    'Nike': {
      brand: 'Nike',
      products: ['Air Max 2024', 'Jordan Retro', 'Nike Pro', 'DriFit'],
      services: ['Nike Support', 'Nike Training Club', 'SNKRS'],
      competitors: ['Adidas', 'Puma', 'Under Armour']
    },
    'Samsung': {
      brand: 'Samsung',
      products: ['Galaxy S25', 'Galaxy Watch 7', 'Galaxy Tab S10', 'Samsung OLED TV'],
      services: ['Samsung Support', 'Samsung+', 'SmartThings'],
      competitors: ['LG', 'Sony', 'Apple']
    },
    'Mercedes': {
      brand: 'Mercedes',
      products: ['EQS Sedan', 'AMG GT', 'G-Class', 'Mercedes-EQ'],
      services: ['Mercedes Support', 'Mercedes me', 'Mercedes Connect'],
      competitors: ['BMW', 'Audi', 'Tesla']
    },
    'Starbucks': {
      brand: 'Starbucks',
      products: ['Pumpkin Spice Latte', 'Cold Brew', 'Refresher', 'Frappuccino'],
      services: ['Starbucks Rewards', 'Mobile Order', 'Starbucks App'],
      competitors: ['Dunkin', 'Costa Coffee', 'Peets Coffee']
    }
  };

  return fallbacks[brandName] || {
    brand: brandName,
    products: ['Product A', 'Product B', 'Product C'],
    services: ['Basic Support', 'Premium Service'],
    competitors: ['Competitor A', 'Competitor B']
  };
}

// Tweet generation with chaos
function generateTweet(brand: string, product: string, category: BrandCategory, language: string): string {
  const lang = LANGUAGES[language as keyof typeof LANGUAGES];
  const patterns = TWEET_PATTERNS;
  
  // Select random pattern type
  const patternTypes = Object.keys(patterns);
  const randomType = patternTypes[Math.floor(Math.random() * patternTypes.length)] as keyof typeof patterns;
  const typePatterns = patterns[randomType];
  const pattern = typePatterns[Math.floor(Math.random() * typePatterns.length)];
  
  // Fill in template variables
  let tweet = pattern
    .replace(/{brand}/g, brand)
    .replace(/{product}/g, product)
    .replace(/{feature}/g, () => {
      const features = ['incredible performance', 'amazing design', 'revolutionary technology', 'game-changing innovation', 'stunning quality'];
      return features[Math.floor(Math.random() * features.length)];
    })
    .replace(/{complaint}/g, () => {
      const complaints = ['overheating issues', 'battery problems', 'software bugs', 'customer service delays', 'quality concerns'];
      return complaints[Math.floor(Math.random() * complaints.length)];
    })
    .replace(/{opinion}/g, () => {
      const opinions = ['decent', 'overpriced', 'underwhelming', 'impressive', 'disappointing'];
      return opinions[Math.floor(Math.random() * opinions.length)];
    })
    .replace(/{condition}/g, () => {
      const conditions = ['after the latest update', 'in cold weather', 'during heavy usage', 'with normal settings'];
      return conditions[Math.floor(Math.random() * conditions.length)];
    })
    .replace(/{negative_event}/g, () => {
      const events = ['crashing', 'freezing', 'blue screening', 'rebooting', 'data loss'];
      return events[Math.floor(Math.random() * events.length)];
    })
    .replace(/{frequency}/g, () => {
      const frequencies = ['twice', 'three times', 'constantly', 'every few hours', 'once a week'];
      return frequencies[Math.floor(Math.random() * frequencies.length)];
    })
    .replace(/{negative_action}/g, () => {
      const actions = ['crashed', 'failed', 'malfunctioned', 'stopped working', 'broke'];
      return actions[Math.floor(Math.random() * actions.length)];
    })
    .replace(/{action}/g, () => {
      const actions = ['upgraded', 'installed', 'configured', 'purchased', 'tested'];
      return actions[Math.floor(Math.random() * actions.length)];
    })
    .replace(/{result}/g, () => {
      const results = ['perfectly', 'with some issues', 'better than expected', 'worse than hoped', 'exactly as advertised'];
      return results[Math.floor(Math.random() * results.length)];
    })
    .replace(/{time}/g, () => {
      const times = ['30 minutes', '2 hours', 'all day', '5 seconds', '1 week'];
      return times[Math.floor(Math.random() * times.length)];
    })
    .replace(/{quality}/g, () => {
      const qualities = ['amazing', 'terrible', 'helpful', 'useless', 'professional'];
      return qualities[Math.floor(Math.random() * qualities.length)];
    })
    .replace(/{trend}/g, () => {
      const trends = ['surging 20%', 'dropping 15%', 'stable', 'volatile', 'recovering'];
      return trends[Math.floor(Math.random() * trends.length)];
    })
    .replace(/{event}/g, () => {
      const events = ['earnings report', 'product launch', 'security breach', 'CEO announcement', 'market analysis'];
      return events[Math.floor(Math.random() * events.length)];
    })
    .replace(/{announcement}/g, () => {
      const announcements = ['massive layoffs', 'new AI division', 'acquisition of startup', 'price increase', 'product recall'];
      return announcements[Math.floor(Math.random() * announcements.length)];
    })
    .replace(/{reaction}/g, () => {
      const reactions = ['shocked', 'excited', 'worried', 'impressed', 'skeptical'];
      return reactions[Math.floor(Math.random() * reactions.length)];
    })
    .replace(/{competitor}/g, () => {
      const competitors = category.competitors[Math.floor(Math.random() * category.competitors.length)];
      return competitors;
    })
    .replace(/{price}/g, () => {
      const prices = ['$999', '$1299', '$299', '$4999', '$199', '$799'];
      return prices[Math.floor(Math.random() * prices.length)];
    })
    .replace(/{feature}/g, () => {
      const features = ['AI integration', 'cloud storage', 'performance boost', 'design overhaul'];
      return features[Math.floor(Math.random() * features.length)];
    })
    .replace(/{simple_task}/g, () => {
      const tasks = ['password reset', 'order status', 'basic inquiry', 'warranty claim'];
      return tasks[Math.floor(Math.random() * tasks.length)];
    })
    .replace(/{wait_time}/g, () => {
      const waitTimes = ['3 hours', '2 days', '1 week', '30 minutes', '5 days'];
      return waitTimes[Math.floor(Math.random() * waitTimes.length)];
    })
    .replace(/{service}/g, () => {
      const services = ['technical support', 'customer service', 'billing support', 'sales support'];
      return services[Math.floor(Math.random() * services.length)];
    })
    .replace(/{crypto}/g, () => {
      const cryptos = ['Bitcoin', 'Ethereum', 'Dogecoin', 'Shiba Inu', 'Cardano'];
      return cryptos[Math.floor(Math.random() * cryptos.length)];
    })
    .replace(/{duration}/g, () => {
      const durations = ['2 weeks', '3 days', '1 month', '6 months', '1 year'];
      return durations[Math.floor(Math.random() * durations.length)];
    })
    .replace(/{component}/g, () => {
      const components = ['screen', 'battery', 'camera', 'speaker', 'processor'];
      return components[Math.floor(Math.random() * components.length)];
    })
    .replace(/{defect}/g, () => {
      const defects = ['screen flicker', 'battery drain', 'overheating', 'software crashes', 'build quality'];
      return defects[Math.floor(Math.random() * defects.length)];
    })
    .replace(/{problem}/g, () => {
      const problems = ['overpriced', 'poor quality', 'limited features', 'compatibility issues'];
      return problems[Math.floor(Math.random() * problems.length)];
    });

  // Add random emojis for chaos
  const emojis = ['🔥', '💀', '🚀', '💯', '🎯', '⚡', '🌟', '💎', '🤔', '😤', '🙃', '💸', '😭', '🔒'];
  const randomEmojis = emojis.slice(0, Math.floor(Math.random() * 3) + 1);
  
  // Add random hashtags
  const hashtags = ['#tech', '#review', '#complaints', '#excited', '#disappointed', '#startup', '#innovation', '#fail', '#win'];
  const randomHashtags = hashtags.slice(0, Math.floor(Math.random() * 3) + 1);
  
  return `${tweet} ${randomEmojis.join(' ')} ${randomHashtags.join(' ')}`;
}

// Main seeding function
async function megaSeedChaos() {
  console.log('🌪 Starting MEGA SEED: 100K Twitter Chaos Simulation');
  console.log('⚠️ WARNING: This will push Supabase free tier limits!');
  
  const supabase = createSupabaseClient();
  const BATCH_SIZE = 5000;
  const TOTAL_RECORDS = 100000;
  
  try {
    // Generate brand categories for all brands
    console.log('🧠 Generating AI-powered brand categories...');
    const brandCategories = new Map<string, BrandCategory>();
    
    for (const brand of BRANDS) {
      const category = await generateBrandCategories(brand);
      brandCategories.set(brand, category);
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    }
    
    console.log('✅ Brand categories generated for:', Array.from(brandCategories.keys()));
    
    // Generate tweets in batches
    console.log(`📊 Generating ${TOTAL_RECORDS} chaotic tweets in batches of ${BATCH_SIZE}...`);
    
    let totalProcessed = 0;
    let totalErrors = 0;
    
    for (let batch = 0; batch < TOTAL_RECORDS / BATCH_SIZE; batch++) {
      const batchStart = batch * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_RECORDS);
      const batchSize = batchEnd - batchStart;
      
      console.log(`🔄 Processing batch ${batch + 1}/${Math.ceil(TOTAL_RECORDS / BATCH_SIZE)} (${batchSize} records)...`);
      
      const batchPromises = [];
      
      for (let i = 0; i < batchSize; i++) {
        const recordIndex = batchStart + i;
        
        // Random brand selection
        const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
        const category = brandCategories.get(brand)!;
        
        // Random product from AI-generated categories
        const product = category.products[Math.floor(Math.random() * category.products.length)];
        
        // Random language
        const langKeys = Object.keys(LANGUAGES);
        const randomLang = langKeys[Math.floor(Math.random() * langKeys.length)] as keyof typeof LANGUAGES;
        
        // Random tweet type based on chaos distribution
        const rand = Math.random();
        let tweetType: keyof typeof TWEET_PATTERNS;
        let sentiment: 'positive' | 'neutral' | 'negative';
        
        if (rand < 0.35) {
          // 35% normal tweets
          const normalTypes = ['normal'] as const;
          tweetType = normalTypes[Math.floor(Math.random() * normalTypes.length)];
          sentiment = Math.random() < 0.6 ? 'positive' : Math.random() < 0.8 ? 'neutral' : 'negative';
        } else if (rand < 0.45) {
          // 10% sarcastic tweets
          const sarcasticTypes = ['sarcastic'] as const;
          tweetType = sarcasticTypes[Math.floor(Math.random() * sarcasticTypes.length)];
          sentiment = 'negative'; // Sarcastic always looks negative to AI
        } else if (rand < 0.50) {
          // 5% spam
          const spamTypes = ['spam'] as const;
          tweetType = spamTypes[Math.floor(Math.random() * spamTypes.length)];
          sentiment = 'positive'; // Spam often uses positive language
        } else if (rand < 0.55) {
          // 5% emoji-only
          const emojiTypes = ['emojiOnly'] as const;
          tweetType = emojiTypes[Math.floor(Math.random() * emojiTypes.length)];
          sentiment = Math.random() < 0.5 ? 'positive' : 'negative'; // Random sentiment for emoji
        } else if (rand < 0.65) {
          // 10% completely irrelevant
          const irrelevantTypes = ['irrelevant'] as const;
          tweetType = irrelevantTypes[Math.floor(Math.random() * irrelevantTypes.length)];
          sentiment = 'neutral'; // Irrelevant should be neutral
        } else if (rand < 0.75) {
          // 10% news style
          const newsTypes = ['news'] as const;
          tweetType = newsTypes[Math.floor(Math.random() * newsTypes.length)];
          sentiment = Math.random() < 0.6 ? 'positive' : Math.random() < 0.8 ? 'neutral' : 'negative';
        } else if (rand < 0.85) {
          // 10% complaints
          const complaintTypes = ['complaints'] as const;
          tweetType = complaintTypes[Math.floor(Math.random() * complaintTypes.length)];
          sentiment = 'negative';
        } else {
          // 15% hype
          const hypeTypes = ['hype'] as const;
          tweetType = hypeTypes[Math.floor(Math.random() * hypeTypes.length)];
          sentiment = 'positive';
        }
        
        const tweet = generateTweet(brand, product, category, randomLang);
        
        // Random date within last 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        const postedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
        
        // Random author handle
        const authorId = Math.floor(Math.random() * 1000000);
        const authorHandle = `user_${authorId}`;
        
        // AI relevance filtering - only assign relevant tweets to brands
        // But we'll store ALL tweets in the database (irrelevant ones as "unassigned")
        const assignedBrand = await isTweetRelevantToBrand(brand, tweet) ? brand : 'unassigned';
        
        batchPromises.push({
          brand: assignedBrand, // null if not relevant
          author_handle: authorHandle,
          raw_text: tweet,
          posted_at: postedAt,
          external_id: `mega-seed-${batch}-${recordIndex}`
        });
      }
      
      // Insert batch
      try {
        const { data, error } = await supabase
          .from('brand_mentions')
          .insert(batchPromises)
          .select();
          
        if (error) {
          console.error(`❌ Batch ${batch + 1} failed:`, error);
          totalErrors += batchSize;
        } else {
          console.log(`✅ Batch ${batch + 1} completed: ${batchSize} records`);
          totalProcessed += batchSize;
        }
        
        // Insert sentiment analyses for this batch
        if (data) {
          const sentimentPromises = data.map(mention => {
            const sentiments = ['positive', 'negative', 'neutral'];
            const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
            
            return {
              mention_id: mention.id,
              model_name: 'mega-seed-chaos',
              sentiment_label: randomSentiment,
              confidence: 0.85 + Math.random() * 0.15, // 85-100% confidence
              latency_ms: Math.floor(Math.random() * 1000)
            };
          });
          
          const { error: sentimentError } = await supabase
            .from('sentiment_analyses')
            .insert(sentimentPromises);
            
          if (sentimentError) {
            console.error(`❌ Sentiment batch ${batch + 1} failed:`, sentimentError);
          } else {
            console.log(`✅ Sentiment batch ${batch + 1} completed: ${sentimentPromises.length} analyses`);
          }
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Batch ${batch + 1} error:`, error);
        totalErrors += batchSize;
      }
      
      // Progress update
      const progress = ((totalProcessed / TOTAL_RECORDS) * 100).toFixed(1);
      console.log(`📈 Progress: ${progress}% (${totalProcessed}/${TOTAL_RECORDS} processed, ${totalErrors} errors)`);
      
      // Check if we're approaching Supabase limits
      if (totalErrors > TOTAL_RECORDS * 0.05) { // If more than 5% error rate
        console.log('⚠️ High error rate detected. Consider reducing batch size or stopping.');
        break;
      }
    }
    
    console.log('🎉 MEGA SEEDING COMPLETED!');
    console.log(`📊 Final Stats: ${totalProcessed} records processed, ${totalErrors} errors`);
    console.log('🔥 Twitter chaos successfully unleashed upon SentiBrand-X!');
    
  } catch (error) {
    console.error('💀 Mega seeding failed:', error);
    process.exit(1);
  }
}

// Run the chaos
if (require.main === module) {
  megaSeedChaos()
    .then(() => {
      console.log('✨ Mega seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Mega seeding failed:', error);
      process.exit(1);
    });
}
