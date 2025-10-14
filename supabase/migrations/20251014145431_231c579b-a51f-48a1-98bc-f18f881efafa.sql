-- Add more Italian newspapers to default RSS feeds
INSERT INTO public.rss_feeds (url, name, is_default, enabled) VALUES
  ('https://www.corriere.it/rss/homepage.xml', 'Corriere della Sera', true, true),
  ('https://www.repubblica.it/rss/homepage/rss2.0.xml', 'La Repubblica', true, true),
  ('https://www.ilsole24ore.com/rss/italia.xml', 'Il Sole 24 Ore', true, true),
  ('https://www.lastampa.it/rss/italia.xml', 'La Stampa', true, true),
  ('https://www.ilmessaggero.it/rss/italia.xml', 'Il Messaggero', true, true),
  ('https://www.ilgiornale.it/rss/home.xml', 'Il Giornale', true, true),
  ('https://www.huffingtonpost.it/rss/italia/', 'HuffPost Italia', true, true),
  ('https://www.adnkronos.com/rss', 'Adnkronos', true, true)
ON CONFLICT DO NOTHING;

-- Add user preferences for default feeds (to allow disabling them)
CREATE TABLE IF NOT EXISTS public.user_feed_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feed_id uuid NOT NULL REFERENCES public.rss_feeds(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, feed_id)
);

ALTER TABLE public.user_feed_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feed preferences"
  ON public.user_feed_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feed preferences"
  ON public.user_feed_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feed preferences"
  ON public.user_feed_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feed preferences"
  ON public.user_feed_preferences
  FOR DELETE
  USING (auth.uid() = user_id);