import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";

config({ path: path.resolve(process.cwd(), ".env.local") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log("🔄 Starting database migrations for engagement metrics...");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Missing Supabase credentials. Please check your .env.local file.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Check if we can use RPC (requires service role key for admin operations)
    console.log("📋 Adding engagement columns to brand_mentions table...");
    
    // Since we're using anon key, we'll need to use SQL through the Supabase dashboard
    // For now, let's create a SQL script that the user can run manually
    
    const migrationSQL = `
-- Add engagement metrics to brand_mentions table
ALTER TABLE brand_mentions 
ADD COLUMN IF NOT EXISTS author_followers BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS retweets BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS replies BIGINT DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_mentions_brand_posted_at ON brand_mentions(brand, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_mentions_author_followers ON brand_mentions(author_followers DESC);
CREATE INDEX IF NOT EXISTS idx_brand_mentions_engagement ON brand_mentions(likes + retweets + replies DESC);
CREATE INDEX IF NOT EXISTS idx_brand_mentions_posted_at ON brand_mentions(posted_at DESC);

-- Add unique constraint for sentiment_analyses (for upsert operations)
-- First drop any existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sentiment_analyses_mention_id_unique' 
        AND table_name = 'sentiment_analyses'
    ) THEN
        ALTER TABLE sentiment_analyses DROP CONSTRAINT sentiment_analyses_mention_id_unique;
    END IF;
END $$;

-- Add unique constraint on mention_id
ALTER TABLE sentiment_analyses 
ADD CONSTRAINT sentiment_analyses_mention_id_unique UNIQUE (mention_id);

-- Create index for sentiment_analyses performance
CREATE INDEX IF NOT EXISTS idx_sentiment_analyses_mention_id ON sentiment_analyses(mention_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analyses_sentiment_label ON sentiment_analyses(sentiment_label);

-- Add RLS policies if needed (optional, depends on your setup)
-- ALTER POLICY "Users can view all brand mentions" ON brand_mentions FOR SELECT USING (true);
-- ALTER POLICY "Users can insert brand mentions" ON brand_mentions FOR INSERT WITH CHECK (true);
`;

    console.log("📝 Please run the following SQL in your Supabase dashboard:");
    console.log("================================================");
    console.log(migrationSQL);
    console.log("================================================");
    console.log("\n🔗 Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql");
    console.log("\nAfter running the SQL, you can run: npm run seed:bigdata");
    
    // Test if columns exist by trying a simple query
    console.log("\n🧪 Testing if columns exist...");
    const { data, error } = await supabase
      .from("brand_mentions")
      .select("id, author_followers, likes, retweets, replies")
      .limit(1);

    if (error && error.message.includes("column")) {
      console.log("❌ Columns don't exist yet. Please run the SQL migration first.");
      return false;
    } else if (error) {
      console.log("ℹ️ Other error (might be empty table):", error.message);
    } else {
      console.log("✅ Columns exist! Database is ready for seeding.");
      return true;
    }

  } catch (error) {
    console.error("❌ Migration error:", error);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log("🔗 Testing database connection...");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Missing Supabase credentials.");
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await supabase
      .from("brand_mentions")
      .select("count")
      .limit(1);

    if (error) {
      console.error("❌ Database connection failed:", error.message);
      return false;
    }

    console.log("✅ Database connection successful!");
    return true;
  } catch (error) {
    console.error("❌ Connection test failed:", error);
    return false;
  }
}

async function main() {
  console.log("🚀 Database Migration Tool");
  console.log("========================\n");

  // First test connection
  const connected = await testDatabaseConnection();
  if (!connected) {
    process.exit(1);
  }

  // Run migrations
  const migrationReady = await runMigrations();
  
  if (migrationReady) {
    console.log("\n🎉 Migration completed successfully!");
    console.log("🌱 You can now run: npm run seed:bigdata");
  } else {
    console.log("\n⚠️ Please complete the manual SQL migration first.");
  }
}

main().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
