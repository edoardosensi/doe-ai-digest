-- Add section column to rss_feeds table
ALTER TABLE public.rss_feeds 
ADD COLUMN section_name text;

-- Add constraint to match user_sections section names
ALTER TABLE public.rss_feeds
ADD CONSTRAINT rss_feeds_section_fkey 
CHECK (section_name IS NULL OR section_name IN ('Politica', 'Politica estera', 'Sport', 'Cultura', 'Roma', 'Filosofia', 'Scienza', 'Televisione', 'Stampa internazionale'));

-- Insert international press RSS feeds
INSERT INTO public.rss_feeds (name, url, is_default, enabled, section_name) VALUES
('The New York Times', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', true, true, 'Stampa internazionale'),
('BBC News', 'https://feeds.bbci.co.uk/news/world/rss.xml', true, true, 'Stampa internazionale'),
('The Guardian', 'https://www.theguardian.com/world/rss', true, true, 'Stampa internazionale'),
('Le Monde', 'https://www.lemonde.fr/rss/une.xml', true, true, 'Stampa internazionale'),
('El País', 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', true, true, 'Stampa internazionale'),
('Financial Times', 'https://www.ft.com/?format=rss', true, true, 'Stampa internazionale'),
('Reuters World', 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best', true, true, 'Stampa internazionale'),
('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', true, true, 'Stampa internazionale');