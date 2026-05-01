import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";

config({ path: path.resolve(process.cwd(), ".env.local") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TOTAL_MENTIONS = 10000;
const DAYS_BACK = 15;
const BATCH_SIZE = 100; // Process in batches to avoid overwhelming Supabase

// Authority distribution
const AUTHORITY_DISTRIBUTION = {
  TOP_INFLUENCERS: 0.03,    // 3% - 100k-1M followers, high engagement
  MICRO_INFLUENCERS: 0.15,  // 15% - 5k-50k followers, medium engagement
  STANDARD_USERS: 0.82,     // 82% - 0-1k followers, low engagement
};

// Brand distribution (realistic mix)
const BRANDS = [
  "Apple", "Samsung", "Google", "Microsoft", "Amazon", "Tesla", "Meta", "Netflix",
  "Nike", "Adidas", "Coca-Cola", "Pepsi", "McDonald's", "Starbucks", "BMW", "Mercedes",
  "Sony", "Nintendo", "Xbox", "PlayStation", "Intel", "AMD", "NVIDIA", "Oracle"
];

// Content templates by sentiment and language
const CONTENT_TEMPLATES = {
  positive: {
    en: [
      "Absolutely love the new {brand} product! Best purchase ever! 🚀",
      "{brand} customer service is incredible. They solved my issue in minutes! 👏",
      "Just upgraded to {brand} and I'm blown away by the quality! 💯",
      "{brand} never disappoints. This is why I'm a loyal customer! ❤️",
      "The innovation at {brand} is unmatched. Game-changing technology! 🌟",
      "Shoutout to {brand} for making my life so much easier! 🙏",
      "{brand} just keeps getting better. This new feature is amazing! 🎉",
      "Can't imagine my daily routine without {brand} products! 📱",
      "{brand} quality is worth every penny. Premium experience! 💎",
      "Thank you {brand} for listening to customer feedback! Perfect update! ✨"
    ],
    it: [
      "Amo il nuovo prodotto {brand}! Miglior acquisto di sempre! 🚀",
      "Il servizio clienti {brand} è incredibile. Risolto in pochi minuti! 👏",
      "Appena aggiornato a {brand} e sono sbalordito dalla qualità! 💯",
      "{brand} non delude mai. Per questo sono un cliente fedele! ❤️",
      "L'innovazione {brand} è insuperabile. Tecnologia rivoluzionaria! 🌟",
      "Grazie {brand} per aver reso la mia vita più facile! 🙏",
      "{brand} migliora sempre. Questa nuova funzione è fantastica! 🎉",
      "Non posso immaginare la mia giornata senza i prodotti {brand}! 📱",
      "La qualità {brand} vale ogni centesimo. Esperienza premium! 💎",
      "Grazie {brand} per aver ascoltato il feedback! Aggiornamento perfetto! ✨"
    ],
    es: [
      "¡Amo el nuevo producto de {brand}! ¡La mejor compra de mi vida! 🚀",
      "El servicio al cliente de {brand} es increíble. ¡Resuelto en minutos! 👏",
      "Acabo de actualizar a {brand} y estoy impresionado por la calidad! 💯",
      "{brand} nunca decepciona. ¡Por eso soy un cliente leal! ❤️",
      "La innovación de {brand} no tiene igual. ¡Tecnología revolucionaria! 🌟",
      "¡Gracias {brand} por hacer mi vida más fácil! 🙏",
      "{brand} sigue mejorando. ¡Esta nueva función es increíble! 🎉",
      "No puedo imaginar mi día sin los productos de {brand}! 📱",
      "La calidad de {brand} vale cada centavo. ¡Experiencia premium! 💎",
      "¡Gracias {brand} por escuchar el feedback! ¡Actualización perfecta! ✨"
    ]
  },
  negative: {
    en: [
      "Terrible experience with {brand}. Product broke after one week! 😡",
      "{brand} customer service is useless. Hours on hold with no solution! 🤬",
      "Regret buying {brand}. Overpriced and underperforming! 💸",
      "Latest {brand} update ruined everything. Roll it back NOW! 🔥",
      "{brand} quality has dropped significantly. Disappointed loyal customer! 😞",
      "Avoid {brand} at all costs. Scam company with terrible products! ⚠️",
      "{brand} doesn't care about customers. Only interested in money! 🤑",
      "Worst purchase ever. {brand} product is complete garbage! 🗑️",
      "{brand} promised features that don't exist. False advertising! 🤥",
      "Never again buying from {brand. Worst customer experience! 🚫"
    ],
    it: [
      "Esperienza terribile con {brand}. Prodotto rotto dopo una settimana! 😡",
      "Il servizio clienti {brand} è inutile. Ore in attesa senza soluzione! 🤬",
      "Pentito di aver comprato {brand}. Sopraprezzo e sottoperformance! 💸",
      "L'ultimo aggiornamento {brand} ha rovinato tutto. Tornate indietro ORA! 🔥",
      "La qualità {brand} è calata drasticamente. Cliente fedele deluso! 😞",
      "Evitate {brand} a tutti i costi. Azienda truffaldina con prodotti terribili! ⚠️",
      "{brand} non si cura dei clienti. Solo interessato ai soldi! 🤑",
      "Peggior acquisto mai. Il prodotto {brand} è spazzatura completa! 🗑️",
      "{brand} ha promesso funzioni che non esistono. Pubblicità ingannevole! 🤥",
      "Non comprerò mai più da {brand}. Peggior esperienza cliente! 🚫"
    ],
    es: [
      "Experiencia terrible con {brand}. ¡Producto roto después de una semana! 😡",
      "El servicio al cliente de {brand} es inútil. ¡Horas esperando sin solución! 🤬",
      "Lamento haber comprado {brand}. ¡Sobreprecio y bajo rendimiento! 💸",
      "La última actualización de {brand} arruinó todo. ¡Revírtelo AHORA! 🔥",
      "La calidad de {brand} ha caído drásticamente. ¡Cliente leal decepcionado! 😞",
      "Evita {brand} a toda costa. ¡Empresa estafa con productos terribles! ⚠️",
      "A {brand} no le importan los clientes. ¡Solo interesado en dinero! 🤑",
      "La peor compra de mi vida. ¡El producto de {brand} es basura completa! 🗑️",
      "{brand} prometió características que no existen. ¡Publicidad engañosa! 🤥",
      "Nunca más compraré de {brand}. ¡La peor experiencia de cliente! 🚫"
    ]
  },
  neutral: {
    en: [
      "Just received my {brand} order. Processing took 5 business days.",
      "{brand} product works as described. Nothing special, nothing bad.",
      "Trying out {brand} for the first time. Will see how it goes.",
      "{brand} has new features available. Need to explore them more.",
      "The {brand} store was crowded today. Long wait times.",
      "{brand} pricing seems competitive with other brands in market.",
      "Installed {brand} app. Interface is clean and intuitive.",
      "{brand} announced new product launch. Details coming soon.",
      "Been using {brand} for 6 months now. Average experience overall.",
      "{brand} customer support responded within 24 hours about my query."
    ],
    it: [
      "Appena ricevuto il mio ordine {brand}. Elaborazione 5 giorni lavorativi.",
      "Il prodotto {brand} funziona come descritto. Niente di speciale, niente di male.",
      "Provando {brand} per la prima volta. Vedremo come va.",
      "{brand} ha nuove funzioni disponibili. Devo esplorarle meglio.",
      "Il negozio {brand} era affollato oggi. Lunghe attese.",
      "I prezzi {brand} sembrano competitivi con altri marchi sul mercato.",
      "Installato app {brand}. Interfaccia pulita e intuitiva.",
      "{brand} ha annunciato il lancio di un nuovo prodotto. Dettagli presto.",
      "Uso {brand} da 6 mesi. Esperienza media nel complesso.",
      "Il supporto clienti {brand} ha risposto entro 24 ore sulla mia domanda."
    ],
    es: [
      "Acabo de recibir mi pedido de {brand}. El procesamiento tomó 5 días hábiles.",
      "El producto de {brand} funciona como se describe. Nada especial, nada malo.",
      "Probando {brand} por primera vez. Veremos cómo va.",
      "{brand} tiene nuevas características disponibles. Necesito explorarlas más.",
      "La tienda {brand} estaba abarrotada hoy. Tiempos de espera largos.",
      "Los precios de {brand} parecen competitivos con otras marcas del mercado.",
      "Instalé la aplicación de {brand}. La interfaz es limpia e intuitiva.",
      "{brand} anunció el lanzamiento de un nuevo producto. Próximamente más detalles.",
      "Uso {brand} desde hace 6 meses. Experiencia promedio en general.",
      "El soporte al cliente de {brand} respondió dentro de 24 horas sobre mi consulta."
    ]
  }
};

// Crisis clusters configuration
const CRISIS_CLUSTERS = [
  {
    brand: "Apple",
    sentiment: "negative",
    startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    duration: 3 * 60 * 60 * 1000, // 3 hours
    mentionCount: 500,
    engagementMultiplier: 3.0, // High engagement during crisis
  },
  {
    brand: "Tesla",
    sentiment: "negative", 
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    duration: 2 * 60 * 60 * 1000, // 2 hours
    mentionCount: 300,
    engagementMultiplier: 2.5,
  },
  {
    brand: "Meta",
    sentiment: "negative",
    startTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    duration: 4 * 60 * 60 * 1000, // 4 hours
    mentionCount: 400,
    engagementMultiplier: 2.0,
  }
];

// Viral positive clusters
const VIRAL_CLUSTERS = [
  {
    brand: "Nike",
    sentiment: "positive",
    startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    duration: 2 * 60 * 60 * 1000, // 2 hours
    mentionCount: 200,
    engagementMultiplier: 2.5,
  },
  {
    brand: "Netflix",
    sentiment: "positive",
    startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    duration: 3 * 60 * 60 * 1000, // 3 hours
    mentionCount: 250,
    engagementMultiplier: 2.0,
  }
];

interface InfluencerProfile {
  type: "top" | "micro" | "standard";
  followers: number;
  baseEngagement: number;
  verified: boolean;
  handlePrefix: string;
}

function generateInfluencerProfile(): InfluencerProfile {
  const rand = Math.random();
  
  if (rand < AUTHORITY_DISTRIBUTION.TOP_INFLUENCERS) {
    return {
      type: "top",
      followers: Math.floor(Math.random() * 900000) + 100000, // 100k-1M
      baseEngagement: Math.floor(Math.random() * 5000) + 1000, // 1000-6000
      verified: true,
      handlePrefix: ["verified_", "official_", "real_"][Math.floor(Math.random() * 3)]
    };
  } else if (rand < AUTHORITY_DISTRIBUTION.TOP_INFLUENCERS + AUTHORITY_DISTRIBUTION.MICRO_INFLUENCERS) {
    return {
      type: "micro",
      followers: Math.floor(Math.random() * 45000) + 5000, // 5k-50k
      baseEngagement: Math.floor(Math.random() * 500) + 100, // 100-600
      verified: Math.random() < 0.3, // 30% verified
      handlePrefix: ["creator_", "influencer_", "expert_"][Math.floor(Math.random() * 3)]
    };
  } else {
    return {
      type: "standard",
      followers: Math.floor(Math.random() * 1000), // 0-1k
      baseEngagement: Math.floor(Math.random() * 50) + 1, // 1-50
      verified: false,
      handlePrefix: ["user_", "fan_", "customer_"][Math.floor(Math.random() * 3)]
    };
  }
}

function generateContent(brand: string, sentiment: "positive" | "negative" | "neutral"): string {
  const languages: ("en" | "it" | "es")[] = ["en", "it", "es"];
  const lang = languages[Math.floor(Math.random() * languages.length)];
  const templates = CONTENT_TEMPLATES[sentiment][lang];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  return template.replace("{brand}", brand);
}

function generateTimestamp(): Date {
  const now = new Date();
  const daysBack = Math.random() * DAYS_BACK;
  const timestamp = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  
  // Add some hourly clustering to simulate peak activity
  const hour = timestamp.getHours();
  const isPeakHour = (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16) || (hour >= 19 && hour <= 21);
  
  if (isPeakHour && Math.random() < 0.3) {
    // Add some minutes to create clustering during peak hours
    timestamp.setMinutes(timestamp.getMinutes() + Math.floor(Math.random() * 30));
  }
  
  return timestamp;
}

function isInCluster(brand: string, sentiment: string, timestamp: Date): { isCluster: boolean; engagementMultiplier: number } {
  // Check crisis clusters
  for (const cluster of CRISIS_CLUSTERS) {
    if (cluster.brand === brand && cluster.sentiment === sentiment) {
      const clusterEnd = new Date(cluster.startTime.getTime() + cluster.duration);
      if (timestamp >= cluster.startTime && timestamp <= clusterEnd) {
        return { isCluster: true, engagementMultiplier: cluster.engagementMultiplier };
      }
    }
  }
  
  // Check viral clusters
  for (const cluster of VIRAL_CLUSTERS) {
    if (cluster.brand === brand && cluster.sentiment === sentiment) {
      const clusterEnd = new Date(cluster.startTime.getTime() + cluster.duration);
      if (timestamp >= cluster.startTime && timestamp <= clusterEnd) {
        return { isCluster: true, engagementMultiplier: cluster.engagementMultiplier };
      }
    }
  }
  
  return { isCluster: false, engagementMultiplier: 1.0 };
}

function generateMention(index: number) {
  const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
  const sentimentRand = Math.random();
  let sentiment: "positive" | "negative" | "neutral";
  
  // Adjust sentiment distribution for crisis/viral clusters
  const timestamp = generateTimestamp();
  const clusterInfo = isInCluster(brand, "negative", timestamp);
  
  if (clusterInfo.isCluster && brand === CRISIS_CLUSTERS.find(c => c.brand === brand)?.brand) {
    sentiment = "negative";
  } else if (clusterInfo.isCluster && brand === VIRAL_CLUSTERS.find(c => c.brand === brand)?.brand) {
    sentiment = "positive";
  } else {
    // Normal distribution: 40% positive, 35% neutral, 25% negative
    if (sentimentRand < 0.4) sentiment = "positive";
    else if (sentimentRand < 0.75) sentiment = "neutral";
    else sentiment = "negative";
  }
  
  const profile = generateInfluencerProfile();
  const content = generateContent(brand, sentiment);
  
  // Calculate engagement based on profile and cluster
  let likes = Math.floor(profile.baseEngagement * (0.5 + Math.random()));
  let retweets = Math.floor(likes * (0.1 + Math.random() * 0.2));
  let replies = Math.floor(likes * (0.05 + Math.random() * 0.15));
  
  // Apply cluster engagement multiplier
  if (clusterInfo.isCluster) {
    likes = Math.floor(likes * clusterInfo.engagementMultiplier);
    retweets = Math.floor(retweets * clusterInfo.engagementMultiplier);
    replies = Math.floor(replies * clusterInfo.engagementMultiplier);
  }
  
  return {
    id: `seed_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    brand,
    authorHandle: `${profile.handlePrefix}${profile.type}_${Math.floor(Math.random() * 999999)}`,
    authorFollowers: profile.followers,
    text: content,
    createdAt: timestamp.toISOString(),
    lang: "en", // Simplified for seeding
    source: "x" as const,
    likes,
    retweets,
    replies,
    sentiment,
  };
}

async function insertBatch(supabase: SupabaseClient, mentions: any[]) {
  try {
    // Insert mentions
    const { data: insertedMentions, error: mentionError } = await supabase
      .from("brand_mentions")
      .upsert(
        mentions.map(m => ({
          external_id: m.id,
          brand: m.brand,
          author_handle: m.authorHandle,
          author_followers: m.authorFollowers,
          source: m.source,
          raw_text: m.text,
          normalized_text: m.text.toLowerCase().trim(),
          language_code: m.lang,
          posted_at: m.createdAt,
          likes: m.likes,
          retweets: m.retweets,
          replies: m.replies,
        })),
        { onConflict: "external_id" }
      )
      .select("id");

    if (mentionError) {
      console.error("Error inserting mentions batch:", mentionError);
      return false;
    }

    if (!insertedMentions || insertedMentions.length === 0) {
      console.log("ℹ️ No new mentions inserted (all duplicates)");
      return true;
    }

    // Generate sentiment analyses
    const analyses = insertedMentions.map((mention, index) => ({
      mention_id: mention.id,
      sentiment_label: mentions[index].sentiment,
      confidence: 0.8 + Math.random() * 0.2, // 80-100% confidence
      model_name: "gpt-4o",
      created_at: new Date().toISOString(),
    }));

    // Insert sentiment analyses one by one to handle constraint issues
    let analysisSuccessCount = 0;
    for (const analysis of analyses) {
      const { error: analysisError } = await supabase
        .from("sentiment_analyses")
        .upsert(analysis, { onConflict: "mention_id" });

      if (analysisError) {
        console.error("Error inserting single analysis:", analysisError);
      } else {
        analysisSuccessCount++;
      }
    }

    console.log(`✅ Inserted ${insertedMentions.length} mentions, ${analysisSuccessCount} analyses`);
    return analysisSuccessCount > 0;
  } catch (error) {
    console.error("Batch insertion error:", error);
    return false;
  }
}

async function cleanOldData(supabase: SupabaseClient) {
  console.log("🧹 Cleaning old data before seeding...");
  
  try {
    // Delete sentiment analyses first (foreign key constraint)
    const { error: analysisError } = await supabase
      .from("sentiment_analyses")
      .delete()
      .gte("mention_id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (analysisError) {
      console.error("Error cleaning sentiment_analyses:", analysisError);
      return false;
    }

    // Delete brand mentions
    const { error: mentionError } = await supabase
      .from("brand_mentions")
      .delete()
      .gte("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (mentionError) {
      console.error("Error cleaning brand_mentions:", mentionError);
      return false;
    }

    console.log("✅ Old data cleaned successfully!");
    return true;
  } catch (error) {
    console.error("Error during cleanup:", error);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting massive data seeding with 10,000 mentions...");
  console.log("📊 This will stress test your influence algorithm and dashboard performance!");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Missing Supabase credentials. Please check your .env.local file.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Clean old data first
  const cleaned = await cleanOldData(supabase);
  if (!cleaned) {
    console.error("❌ Failed to clean old data. Aborting seeding.");
    process.exit(1);
  }

  console.log("⏰ Generating mentions with temporal distribution and crisis clusters...");
  
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < TOTAL_MENTIONS; i += BATCH_SIZE) {
    const batch = [];
    const endIndex = Math.min(i + BATCH_SIZE, TOTAL_MENTIONS);
    
    for (let j = i; j < endIndex; j++) {
      batch.push(generateMention(j));
    }

    console.log(`📝 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(TOTAL_MENTIONS / BATCH_SIZE)} (${batch.length} mentions)`);
    
    const success = await insertBatch(supabase, batch);
    
    if (success) {
      successCount += batch.length;
      console.log(`✅ Batch successful! Total inserted: ${successCount}`);
    } else {
      failureCount += batch.length;
      console.error(`❌ Batch failed! Failed: ${failureCount}`);
    }

    // Add small delay to avoid overwhelming Supabase
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log("\n🎉 Seeding completed!");
  console.log(`✅ Successfully inserted: ${successCount} mentions`);
  console.log(`❌ Failed: ${failureCount} mentions`);
  console.log(`📈 Crisis clusters created: ${CRISIS_CLUSTERS.length}`);
  console.log(`🚀 Viral clusters created: ${VIRAL_CLUSTERS.length}`);
  console.log("\n🔥 Now check your dashboard:");
  console.log("   • Analytics page - See the 7-day trends explode with data!");
  console.log("   • Mentions page - Test pagination with 10k records!");
  console.log("   • Brand Search - Compare crisis vs viral brands!");
  console.log("\n⚡ Your influence algorithm will now show real weighted sentiment impact!");
}

main().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
