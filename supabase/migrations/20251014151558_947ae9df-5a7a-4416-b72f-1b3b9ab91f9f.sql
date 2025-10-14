-- Add philosophy-specific RSS feeds
INSERT INTO public.rss_feeds (name, url, is_default, enabled, section_name) VALUES
('Philosophy Now', 'https://philosophynow.org/rss', true, true, 'Filosofia'),
('The Philosopher', 'https://www.thephilosopher1923.org/rss', true, true, 'Filosofia'),
('Aeon Philosophy', 'https://aeon.co/feed/rss', true, true, 'Filosofia');

-- Add science-specific RSS feeds  
INSERT INTO public.rss_feeds (name, url, is_default, enabled, section_name) VALUES
('Nature News', 'https://www.nature.com/nature.rss', true, true, 'Scienza'),
('Science Daily', 'https://www.sciencedaily.com/rss/all.xml', true, true, 'Scienza'),
('Scientific American', 'https://www.scientificamerican.com/feed/', true, true, 'Scienza');

-- Add Rome-specific RSS feeds
INSERT INTO public.rss_feeds (name, url, is_default, enabled, section_name) VALUES
('Roma Today', 'https://www.romatoday.it/rss/', true, true, 'Roma'),
('Il Messaggero Roma', 'https://www.ilmessaggero.it/rss/roma.xml', true, true, 'Roma');

-- Add TV-specific RSS feeds
INSERT INTO public.rss_feeds (name, url, is_default, enabled, section_name) VALUES
('TV Sorrisi e Canzoni', 'https://www.sorrisi.com/feed/', true, true, 'Televisione'),
('Fanpage TV', 'https://www.fanpage.it/tv/feed/', true, true, 'Televisione');