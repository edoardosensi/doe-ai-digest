-- Create articles table to store real articles
CREATE TABLE public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  url text NOT NULL UNIQUE,
  image_url text,
  source text NOT NULL,
  published_at timestamp with time zone,
  category text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_clicks table to track user behavior
CREATE TABLE public.user_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  clicked_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_clicks ENABLE ROW LEVEL SECURITY;

-- Articles are viewable by everyone (authenticated users)
CREATE POLICY "Articles are viewable by authenticated users" 
ON public.articles 
FOR SELECT 
TO authenticated
USING (true);

-- Users can view their own clicks
CREATE POLICY "Users can view their own clicks" 
ON public.user_clicks 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own clicks
CREATE POLICY "Users can insert their own clicks" 
ON public.user_clicks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add interests column to profiles with default
ALTER TABLE public.profiles
ADD COLUMN interests TEXT DEFAULT 'tecnologia, scienza, cultura';

-- Create index for better performance on user clicks
CREATE INDEX idx_user_clicks_user_id ON public.user_clicks(user_id);
CREATE INDEX idx_user_clicks_article_id ON public.user_clicks(article_id);
CREATE INDEX idx_articles_source ON public.articles(source);
CREATE INDEX idx_articles_published_at ON public.articles(published_at DESC);