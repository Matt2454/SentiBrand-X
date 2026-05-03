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
  // AMD Ryzen 9000 - Mostly Positive with Some Issues
  {
    brand: 'AMD',
    product: 'Ryzen 9000',
    text: 'Just upgraded to Ryzen 9000 and the performance is insane! 40% faster than my old 5800X ',
    author_handle: '@tech_enthusiast_123',
    sentiment: 'positive',
    confidence: 0.92
  },
  {
    brand: 'AMD',
    product: 'Ryzen 9000',
    text: 'Ryzen 9000 pricing is ridiculous. $599 for a CPU that needs liquid cooling? ',
    author_handle: '@budget_gamer_456',
    sentiment: 'negative',
    confidence: 0.88
  },
  {
    brand: 'AMD',
    product: 'Ryzen 9000',
    text: 'The Ryzen 9000 runs hot but the performance gains over Intel are worth it',
    author_handle: '@pc_builder_789',
    sentiment: 'positive',
    confidence: 0.85
  },
  {
    brand: 'AMD',
    product: 'Ryzen 9000',
    text: 'AMD Ryzen 9000 + RTX 4090 = gaming heaven! No more bottlenecks ',
    author_handle: '@pro_gamer_234',
    sentiment: 'positive',
    confidence: 0.94
  },
  {
    brand: 'AMD',
    product: 'Ryzen 9000',
    text: 'My Ryzen 9000 died after 2 weeks. Customer support is useless, still waiting for RMA ',
    author_handle: '@disappointed_user_567',
    sentiment: 'negative',
    confidence: 0.91
  },

  // iPhone 16 - Very Positive Reception
  {
    brand: 'Apple',
    product: 'iPhone 16',
    text: 'iPhone 16 camera is revolutionary! Night mode looks like daytime ',
    author_handle: '@photography_pro_890',
    sentiment: 'positive',
    confidence: 0.89
  },
  {
    brand: 'Apple',
    product: 'iPhone 16',
    text: 'iPhone 16 is basically iPhone 15 with a new number. $1299 for what? ',
    author_handle: '@skeptical_tech_345',
    sentiment: 'negative',
    confidence: 0.87
  },
  {
    brand: 'Apple',
    product: 'iPhone 16',
    text: 'Battery life on iPhone 16 is noticeably better, but the design is getting boring',
    author_handle: '@daily_user_678',
    sentiment: 'positive',
    confidence: 0.83
  },
  {
    brand: 'Apple',
    product: 'iPhone 16',
    text: 'The A18 chip in iPhone 16 is a beast! Apps launch instantly ',
    author_handle: '@power_user_901',
    sentiment: 'positive',
    confidence: 0.91
  },
  {
    brand: 'Apple',
    product: 'iPhone 16',
    text: 'iPhone 16 Pro Max weighs a ton. My wrist hurts after 10 minutes of use ',
    author_handle: '@casual_user_234',
    sentiment: 'negative',
    confidence: 0.79
  },

  // Tesla Model 3 Highland - Mixed with More Negatives
  {
    brand: 'Tesla',
    product: 'Model 3 Highland',
    text: 'The new Model 3 Highland interior is so clean and minimalist! Love the ambient lighting ',
    author_handle: '@tesla_fan_456',
    sentiment: 'positive',
    confidence: 0.93
  },
  {
    brand: 'Tesla',
    product: 'Model 3 Highland',
    text: 'Tesla removed the turn signal stalks. This is dangerous and stupid. What were they thinking? ',
    author_handle: '@safety_concerned_789',
    sentiment: 'negative',
    confidence: 0.96
  },
  {
    brand: 'Tesla',
    product: 'Model 3 Highland',
    text: 'Range improvement is decent but the price increase cancels out any savings',
    author_handle: '@practical_buyer_012',
    sentiment: 'negative',
    confidence: 0.81
  },
  {
    brand: 'Tesla',
    product: 'Model 3 Highland',
    text: 'Full Self-Driving on the new Model 3 is finally getting good! Almost hands-free on highway ',
    author_handle: '@early_adopter_345',
    sentiment: 'positive',
    confidence: 0.88
  },
  {
    brand: 'Tesla',
    product: 'Model 3 Highland',
    text: 'Build quality issues persist. Panel gaps are still uneven on a $50k car ',
    author_handle: '@quality_control_678',
    sentiment: 'negative',
    confidence: 0.84
  },

  // Sony PlayStation 6 - Very Positive Hype
  {
    brand: 'Sony',
    product: 'PlayStation 6',
    text: 'PS6 graphics look like real life! The ray tracing is insane ',
    author_handle: '@gamer_news_901',
    sentiment: 'positive',
    confidence: 0.92
  },
  {
    brand: 'Sony',
    product: 'PlayStation 6',
    text: '$699 for PS6? Sony is out of their minds. Console gaming is getting too expensive ',
    author_handle: '@budget_gamer_234',
    sentiment: 'negative',
    confidence: 0.87
  },
  {
    brand: 'Sony',
    product: 'PlayStation 6',
    text: 'Backward compatibility sounds good but we need to see actual performance',
    author_handle: '@skeptical_gamer_567',
    sentiment: 'positive',
    confidence: 0.79
  },
  {
    brand: 'Sony',
    product: 'PlayStation 6',
    text: 'The SSD in PS6 is lightning fast! Loading screens are basically gone ',
    author_handle: '@tech_reviewer_890',
    sentiment: 'positive',
    confidence: 0.94
  },
  {
    brand: 'Sony',
    product: 'PlayStation 6',
    text: 'PS6 controller design is ugly. Why fix what wasn\'t broken? ',
    author_handle: '@design_critique_123',
    sentiment: 'negative',
    confidence: 0.82
  },

  // Microsoft Copilot Pro - Mixed with More Positives
  {
    brand: 'Microsoft',
    product: 'Copilot Pro',
    text: 'Copilot Pro integration with Office is amazing! It writes my emails for me ',
    author_handle: '@office_worker_456',
    sentiment: 'positive',
    confidence: 0.89
  },
  {
    brand: 'Microsoft',
    product: 'Copilot Pro',
    text: 'Copilot Pro keeps hallucinating and making up facts in my reports. Not reliable for work ',
    author_handle: '@professional_user_789',
    sentiment: 'negative',
    confidence: 0.91
  },
  {
    brand: 'Microsoft',
    product: 'Copilot Pro',
    text: 'AI features are neat but I\'m not sure they\'re worth $20/month yet',
    author_handle: '@cost_conscious_012',
    sentiment: 'positive',
    confidence: 0.85
  },
  {
    brand: 'Microsoft',
    product: 'Copilot Pro',
    text: 'Code generation in Copilot Pro has saved me hours of development time! ',
    author_handle: '@developer_life_345',
    sentiment: 'positive',
    confidence: 0.93
  },
  {
    brand: 'Microsoft',
    product: 'Copilot Pro',
    text: 'Privacy concerns with Copilot Pro are real. It scans everything you type ',
    author_handle: '@privacy_advocate_678',
    sentiment: 'negative',
    confidence: 0.88
  }
];

async function seedProductData() {
  const supabase = createSupabaseClient();
  
  console.log(' Seeding product-specific mentions...');
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
