-- Add custom profile description to profiles table
ALTER TABLE profiles 
ADD COLUMN custom_profile TEXT;

-- Create table for RSS feeds
CREATE TABLE IF NOT EXISTS rss_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on rss_feeds
ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view feeds (they're public sources)
CREATE POLICY "Anyone can view RSS feeds"
ON rss_feeds
FOR SELECT
TO authenticated
USING (true);

-- Create user_rss_feeds table for custom user feeds
CREATE TABLE IF NOT EXISTS user_rss_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, url)
);

-- Enable RLS on user_rss_feeds
ALTER TABLE user_rss_feeds ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own feeds
CREATE POLICY "Users can view their own RSS feeds"
ON user_rss_feeds
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own feeds
CREATE POLICY "Users can insert their own RSS feeds"
ON user_rss_feeds
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own feeds
CREATE POLICY "Users can update their own RSS feeds"
ON user_rss_feeds
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own feeds
CREATE POLICY "Users can delete their own RSS feeds"
ON user_rss_feeds
FOR DELETE
USING (auth.uid() = user_id);

-- Insert default Italian news feeds
INSERT INTO rss_feeds (url, name, is_default) VALUES
  ('https://www.repubblica.it/rss/homepage/rss2.0.xml', 'La Repubblica', true),
  ('https://www.corriere.it/rss/homepage.xml', 'Corriere della Sera', true),
  ('https://www.lastampa.it/rss/homepage.xml', 'La Stampa', true),
  ('https://www.ilsole24ore.com/rss/italia.xml', 'Il Sole 24 Ore', true),
  ('https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml', 'ANSA', true)
ON CONFLICT (url) DO NOTHING;

-- Trigger for updating updated_at on rss_feeds
CREATE TRIGGER update_rss_feeds_updated_at
BEFORE UPDATE ON rss_feeds
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();