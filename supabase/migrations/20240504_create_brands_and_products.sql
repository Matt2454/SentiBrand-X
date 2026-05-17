-- Create brands table first
CREATE TABLE IF NOT EXISTS brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  keywords TEXT[] DEFAULT '{}', -- Array of keywords to identify product mentions
  description TEXT,
  launch_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_keywords ON products USING GIN(keywords);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_brands_updated_at 
  BEFORE UPDATE ON brands 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some initial brands for testing
INSERT INTO brands (name) VALUES 
  ('AMD'),
  ('Apple'),
  ('Tesla'),
  ('Sony'),
  ('Microsoft'),
  ('Intel'),
  ('NVIDIA'),
  ('Samsung'),
  ('Google')
ON CONFLICT DO NOTHING;

-- Insert some initial products for testing
INSERT INTO products (name, brand_id, keywords, description) VALUES 
  ('Ryzen 9000', (SELECT id FROM brands WHERE name = 'AMD'), ARRAY['Ryzen 9000', 'Ryzen', '9000', 'CPU'], 'AMD Ryzen 9000 Series - High Performance Gaming CPU'),
  ('iPhone 16', (SELECT id FROM brands WHERE name = 'Apple'), ARRAY['iPhone 16', 'iPhone', '16', 'Apple'], 'Apple iPhone 16 - Latest Smartphone'),
  ('Model 3 Highland', (SELECT id FROM brands WHERE name = 'Tesla'), ARRAY['Model 3', 'Highland', 'Tesla'], 'Tesla Model 3 Highland - Electric Vehicle'),
  ('PlayStation 6', (SELECT id FROM brands WHERE name = 'Sony'), ARRAY['PlayStation 6', 'PS6', 'PlayStation'], 'Sony PlayStation 6 - Gaming Console'),
  ('Copilot Pro', (SELECT id FROM brands WHERE name = 'Microsoft'), ARRAY['Copilot Pro', 'Copilot', 'Microsoft'], 'Microsoft Copilot Pro - AI Assistant')
ON CONFLICT DO NOTHING;
