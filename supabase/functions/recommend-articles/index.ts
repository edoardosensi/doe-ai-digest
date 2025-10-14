import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Getting recommendations for user:', user.id);

    // Get user's click history
    const { data: clicks } = await supabaseClient
      .from('user_clicks')
      .select('article_id, articles(title, description, source)')
      .eq('user_id', user.id)
      .order('clicked_at', { ascending: false })
      .limit(20);

    // Get user's interests from profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('interests')
      .eq('user_id', user.id)
      .single();

    // Get all available articles
    const { data: allArticles } = await supabaseClient
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(100);

    if (!allArticles || allArticles.length === 0) {
      return new Response(
        JSON.stringify({ articles: [] }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let recommendedArticles = [];

    if (clicks && clicks.length >= 5) {
      // User has enough history - use AI to recommend
      const clickedArticlesInfo = clicks
        .map((c: any) => `${c.articles.title} (${c.articles.source})`)
        .join(', ');

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: 'Sei un sistema di raccomandazione di articoli. Basandoti sulla storia degli articoli cliccati dall\'utente, devi identificare i pattern di interesse e selezionare gli articoli più rilevanti dalla lista disponibile.'
            },
            { 
              role: 'user', 
              content: `L'utente ha cliccato questi articoli: ${clickedArticlesInfo}. 
              
Dalla seguente lista di articoli disponibili, seleziona i 10 URL più rilevanti per l'utente in ordine di rilevanza.

Articoli disponibili:
${allArticles.map(a => `URL: ${a.url}, Titolo: ${a.title}, Fonte: ${a.source}`).join('\n')}

Restituisci SOLO un array JSON con gli URL selezionati in questo formato:
["url1", "url2", "url3", ...]`
            }
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
          const recommendedUrls = JSON.parse(content);
          recommendedArticles = allArticles.filter(a => recommendedUrls.includes(a.url)).slice(0, 10);
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          // Fallback to random articles
          recommendedArticles = allArticles.sort(() => Math.random() - 0.5).slice(0, 10);
        }
      } else {
        // Fallback to random articles
        recommendedArticles = allArticles.sort(() => Math.random() - 0.5).slice(0, 10);
      }
    } else {
      // Not enough history - return random articles
      console.log('Not enough click history, returning random articles');
      recommendedArticles = allArticles.sort(() => Math.random() - 0.5).slice(0, 10);
    }

    return new Response(
      JSON.stringify({ articles: recommendedArticles }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in recommend-articles function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
