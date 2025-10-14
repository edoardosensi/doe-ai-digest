-- Update default RSS feeds to include sport and culture specific feeds
DELETE FROM rss_feeds WHERE is_default = true;

INSERT INTO rss_feeds (url, name, is_default, enabled) VALUES
  -- News generali
  ('https://www.repubblica.it/rss/homepage/rss2.0.xml', 'La Repubblica', true, true),
  ('https://www.corriere.it/rss/homepage.xml', 'Corriere della Sera', true, true),
  ('https://www.ansa.it/sito/ansait_rss.xml', 'ANSA', true, true),
  
  -- Sport
  ('https://www.repubblica.it/rss/sport/rss2.0.xml', 'Repubblica Sport', true, true),
  ('https://www.corriere.it/rss/sport.xml', 'Corriere Sport', true, true),
  ('https://www.gazzetta.it/rss/home.xml', 'La Gazzetta dello Sport', true, true),
  ('https://sport.sky.it/rss/sport.xml', 'Sky Sport', true, true),
  
  -- Cultura
  ('https://www.repubblica.it/rss/spettacoli/rss2.0.xml', 'Repubblica Spettacoli', true, true),
  ('https://www.corriere.it/rss/spettacoli.xml', 'Corriere Spettacoli', true, true),
  ('https://www.ansa.it/sito/notizie/cultura/cultura_rss.xml', 'ANSA Cultura', true, true),
  
  -- Politica
  ('https://www.ansa.it/sito/notizie/politica/politica_rss.xml', 'ANSA Politica', true, true),
  ('https://www.repubblica.it/rss/politica/rss2.0.xml', 'Repubblica Politica', true, true)
ON CONFLICT (url) DO NOTHING;