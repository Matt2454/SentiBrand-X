import { createSupabaseClient } from '../lib/supabase';

interface ProductMention {
  brand: string;
  product: string;
  text: string;
  author_handle: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

const PRODUCT_MENTIONS: ProductMention[] = [
  // AMD Ryzen 9000 Series - Product Launch Mentions
  {
    brand: 'AMD',
    product: 'Ryzen 9000',
    text: 'Just upgraded to Ryzen 9000 and the performance is INSANE! 🚀 Gaming at 4K 120fps is finally real',
    author_handle: '@tech_enthusiast_123',
    sentiment: 'positive',
    confidence: 0.92
  },
  {
    brand: 'AMD',
    product: 'Ryzen 9000',
    text: 'Ryzen 9000 pricing is ridiculous. $599 for a CPU that needs liquid cooling? 🤦',
    author_handle: '@budget_gamer_456',
    sentiment: 'negative',
    confidence: 0.88
  },
  {
    brand: 'AMD',
    product: 'Ryzen 9000',
    text: 'The Ryzen 9000 runs hot but the performance gains over Intel are worth it',
    author_handle: '@pc_builder_789',
    sentiment: 'neutral',
    confidence: 0.85
  },
  {
    brand: 'AMD',
    product: 'Ryzen 9000',
    text: 'AMD Ryzen 9000 + RTX 4090 = gaming heaven! No more bottlenecks 🎮',
    author_handle: '@pro_gamer_234',
    sentiment: 'positive',
    confidence: 0.94
  },
  {
    brand: 'AMD',
    product: 'Ryzen 9000',
    text: 'My Ryzen 9000 died after 2 weeks. Customer support is useless, still waiting for RMA 😤',
    author_handle: '@disappointed_user_567',
    sentiment: 'negative',
    confidence: 0.91
  },

  // iPhone 16 Launch - Mixed Reactions
  {
    brand: 'Apple',
    product: 'iPhone 16',
    text: 'iPhone 16 camera is revolutionary! Night mode looks like daytime 📸',
    author_handle: '@photography_pro_890',
    sentiment: 'positive',
    confidence: 0.89
  },
  {
    brand: 'Apple',
    product: 'iPhone 16',
    text: 'iPhone 16 is basically iPhone 15 with a new number. $1299 for what? 🙄',
    author_handle: '@skeptical_tech_345',
    sentiment: 'negative',
    confidence: 0.87
  },
  {
    brand: 'Apple',
    product: 'iPhone 16',
    text: 'Battery life on iPhone 16 is slightly better but still needs daily charging',
    author_handle: '@daily_user_123',
    sentiment: 'neutral',
    confidence: 0.82
  },
  {
    brand: 'Apple',
    product: 'iPhone 16',
    text: 'The AI features in iPhone 16 are actually useful! Live translation saved my trip 🌍',
    author_handle: '@business_traveler_456',
    sentiment: 'positive',
    confidence: 0.93
  },
  {
    brand: 'Apple',
    product: 'iPhone 16',
    text: 'iPhone 16 Pro Max is too heavy. My wrist hurts from holding it 😫',
    author_handle: '@small_hands_789',
    sentiment: 'negative',
    confidence: 0.84
  },

  // Tesla Model 3 Highland - Electric Vehicle Feedback
  {
    brand: 'Tesla',
    product: 'Model 3 Highland',
    text: 'The new Model 3 Highland looks so much better! Finally fixed the ugly front 🚗',
    author_handle: '@tesla_fan_234',
    sentiment: 'positive',
    confidence: 0.91
  },
  {
    brand: 'Tesla',
    product: 'Model 3 Highland',
    text: 'Model 3 Highland removed the stalk. Now I have to use touchscreen for everything 😒',
    author_handle: '@traditional_driver_567',
    sentiment: 'negative',
    confidence: 0.88
  },
  {
    brand: 'Tesla',
    product: 'Model 3 Highland',
    text: 'Range improvement on Model 3 Highland is noticeable but not game-changing',
    author_handle: '@ev_analyst_890',
    sentiment: 'neutral',
    confidence: 0.86
  },
  {
    brand: 'Tesla',
    product: 'Model 3 Highland',
    text: 'Autopilot on Highland is finally getting smart! Actually recognizes pedestrians now 🚶',
    author_handle: '@tech_optimist_345',
    sentiment: 'positive',
    confidence: 0.89
  },
  {
    brand: 'Tesla',
    product: 'Model 3 Highland',
    text: 'Quality control issues on new Model 3. Panel gaps everywhere 😤',
    author_handle: '@detail_owner_123',
    sentiment: 'negative',
    confidence: 0.92
  },

  // Sony PlayStation 6 - Gaming Console Hype
  {
    brand: 'Sony',
    product: 'PlayStation 6',
    text: 'PlayStation 6 graphics are next-gen! Finally true 4K gaming 🎮',
    author_handle: '@console_gamer_456',
    sentiment: 'positive',
    confidence: 0.95
  },
  {
    brand: 'Sony',
    product: 'PlayStation 6',
    text: '$699 for PS6? Sony is crazy. No games at launch either 🎯',
    author_handle: '@budget_gamer_789',
    sentiment: 'negative',
    confidence: 0.87
  },
  {
    brand: 'Sony',
    product: 'PlayStation 6',
    text: 'PS6 controller is comfortable but battery life could be better',
    author_handle: '@casual_gamer_234',
    sentiment: 'neutral',
    confidence: 0.83
  },
  {
    brand: 'Sony',
    product: 'PlayStation 6',
    text: 'Backward compatibility on PS6 is amazing! All my PS4 games work 🎉',
    author_handle: '@retro_gamer_567',
    sentiment: 'positive',
    confidence: 0.91
  },
  {
    brand: 'Sony',
    product: 'PlayStation 6',
    text: 'PS6 runs hot and loud. Need to keep it in open space 🔥',
    author_handle: '@apartment_gamer_890',
    sentiment: 'negative',
    confidence: 0.88
  },

  // Microsoft Copilot Pro - AI Tool Reception
  {
    brand: 'Microsoft',
    product: 'Copilot Pro',
    text: 'Copilot Pro changed how I work! Coding is 10x faster ⚡',
    author_handle: '@developer_productive_345',
    sentiment: 'positive',
    confidence: 0.94
  },
  {
    brand: 'Microsoft',
    product: 'Copilot Pro',
    text: '$30/month for Copilot Pro? Microsoft is getting greedy 💸',
    author_handle: '@freelancer_dev_789',
    sentiment: 'negative',
    confidence: 0.89
  },
  {
    brand: 'Microsoft',
    product: 'Copilot Pro',
    text: 'Copilot Pro features are useful but the learning curve is steep',
    author_handle: '@cautious_adopter_123',
    sentiment: 'neutral',
    confidence: 0.85
  },
  {
    brand: 'Microsoft',
    product: 'Copilot Pro',
    text: 'Excel integration in Copilot Pro saves me hours every week 📊',
    author_handle: '@office_worker_456',
    sentiment: 'positive',
    confidence: 0.92
  },
  {
    brand: 'Microsoft',
    product: 'Copilot Pro',
    text: 'Copilot Pro makes mistakes in code. Still needs human supervision 🤖',
    author_handle: '@senior_dev_567',
    sentiment: 'negative',
    confidence: 0.87
  }
];

async function seedProductData() {
  const supabase = createSupabaseClient();
  
  console.log('🚀 Seeding product-specific mentions...');
  
  try {
    // First, ensure brands exist
    const brands = [...new Set(PRODUCT_MENTIONS.map(m => m.brand))];
    
    for (const brand of brands) {
      const { error: brandError } = await supabase
        .from('brands')
        .upsert({ name: brand }, { onConflict: 'name' })
        .select();
      
      if (brandError) {
        console.error(`Error creating brand ${brand}:`, brandError);
      }
    }

    // Insert product mentions
    for (let i = 0; i < PRODUCT_MENTIONS.length; i++) {
      const mention = PRODUCT_MENTIONS[i];
      
      // Insert brand mention
      const { data: mentionData, error: mentionError } = await supabase
        .from('brand_mentions')
        .insert({
          brand: mention.brand,
          author_handle: mention.author_handle,
          raw_text: mention.text,
          posted_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random within last 30 days
          external_id: `seed-${Date.now()}-${Math.random()}`
        })
        .select()
        .single();

      if (mentionError) {
        console.error(`Error inserting mention ${i}:`, mentionError);
        continue;
      }

      // Insert sentiment analysis
      const { error: analysisError } = await supabase
        .from('sentiment_analyses')
        .insert({
          mention_id: mentionData.id,
          model_name: 'product-test-seed',
          sentiment_label: mention.sentiment,
          confidence: 0.95,
          latency_ms: Math.floor(Math.random() * 1000)
        });

      if (analysisError) {
        console.error(`Error inserting analysis ${i}:`, analysisError);
      }

      console.log(`✅ Seeded ${mention.brand} ${mention.product} mention ${i + 1}/${PRODUCT_MENTIONS.length}`);
    }

    console.log('🎉 Product mention seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Total mentions: ${PRODUCT_MENTIONS.length}`);
    console.log(`   - Brands: ${brands.join(', ')}`);
    console.log(`   - Products: ${[...new Set(PRODUCT_MENTIONS.map(m => m.product))].join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error seeding product data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedProductData();
}

export { seedProductData };
