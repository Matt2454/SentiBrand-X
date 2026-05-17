-- Allow brand to be null for relevance filtering
-- This lets us store all tweets but only assign relevant ones to brands
ALTER TABLE public.brand_mentions 
ALTER COLUMN brand DROP NOT NULL;

-- Add a comment to explain the purpose
COMMENT ON COLUMN public.brand_mentions.brand IS 'Brand name - null if tweet is not relevant to any brand (filtered by AI)';
