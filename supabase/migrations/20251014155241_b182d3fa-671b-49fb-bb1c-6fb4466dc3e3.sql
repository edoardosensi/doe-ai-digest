-- Add section_name to user_rss_feeds table
ALTER TABLE public.user_rss_feeds 
ADD COLUMN IF NOT EXISTS section_name text;