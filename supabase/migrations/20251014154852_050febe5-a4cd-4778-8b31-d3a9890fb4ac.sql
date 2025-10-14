-- Allow users to delete their own clicks
CREATE POLICY "Users can delete their own clicks"
ON public.user_clicks
FOR DELETE
USING (auth.uid() = user_id);