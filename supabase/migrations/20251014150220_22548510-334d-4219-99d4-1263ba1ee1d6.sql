-- Create table for user custom sections
CREATE TABLE IF NOT EXISTS public.user_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  section_name text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, section_name)
);

ALTER TABLE public.user_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sections"
  ON public.user_sections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sections"
  ON public.user_sections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sections"
  ON public.user_sections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sections"
  ON public.user_sections
  FOR DELETE
  USING (auth.uid() = user_id);