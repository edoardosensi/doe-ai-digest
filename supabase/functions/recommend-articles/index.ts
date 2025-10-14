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
              content: 'Sei un esperto giornalista italiano specializzato nella categorizzazione di notizie. Devi analizzare attentamente ogni articolo e categorizzarlo con precisione basandoti ESCLUSIVAMENTE sul contenuto del titolo e della descrizione.'
            },
            { 
              role: 'user', 
              content: `L'utente ha letto questi articoli: ${clickedArticlesInfo}. 

COMPITO: Dalla lista di articoli disponibili, devi selezionare ESATTAMENTE 4 articoli per ogni categoria (totale 16).

CATEGORIE E CRITERI RIGIDI:
1. "Politica" - SOLO politica italiana interna:
   - Governo italiano, ministri italiani, parlamento italiano
   - Partiti politici italiani, elezioni italiane
   - Riforme, leggi italiane, questioni parlamentari
   - NON includere: notizie internazionali, UE, NATO, accordi esteri

2. "Politica estera" - SOLO politica internazionale:
   - Guerra, conflitti internazionali (Ucraina, Gaza, ecc.)
   - Leaders stranieri (Biden, Putin, Xi Jinping)
   - Organizzazioni internazionali (ONU, NATO, UE in contesto globale)
   - Relazioni tra stati, accordi internazionali, geopolitica
   - NON includere: politica italiana, se non in contesto internazionale

3. "Sport" - SOLO sport:
   - Calcio, tennis, basket, Formula 1, ciclismo
   - Campionati, partite, risultati sportivi
   - Atleti, allenatori, squadre
   - NON includere: politica dello sport o economia dello sport

4. "Cultura" - SOLO cultura e spettacolo:
   - Cinema, teatro, musica, arte, mostre
   - Libri, letteratura, premi letterari
   - Festival culturali, concerti, spettacoli
   - NON includere: cronaca culturale o politica culturale

ARTICOLI DISPONIBILI:
${allArticles.map(a => `URL: ${a.url}\nTitolo: ${a.title}\nDescrizione: ${a.description || 'N/A'}\n---`).join('\n')}

IMPORTANTE: 
- Leggi ATTENTAMENTE titolo e descrizione di OGNI articolo
- Se un articolo parla di più temi, usa il tema PRINCIPALE
- Se non ci sono 4 articoli per una categoria, ripeti quelli più attinenti
- NON mischiare le categorie

Restituisci SOLO questo JSON (senza markdown):
{
  "articles": {
    "Politica": ["url1", "url2", "url3", "url4"],
    "Politica estera": ["url1", "url2", "url3", "url4"],
    "Sport": ["url1", "url2", "url3", "url4"],
    "Cultura": ["url1", "url2", "url3", "url4"]
  },
  "userProfile": "Descrizione italiana di 3-4 righe degli interessi dell'utente basata sui suoi click"
}`
            }
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
          const aiResponse = JSON.parse(content);
          const categorizedUrls = aiResponse.articles;
          const userProfile = aiResponse.userProfile;
          
          // Build categorized articles array with category tag
          const categorizedArticles = [];
          for (const [category, urls] of Object.entries(categorizedUrls)) {
            const categoryArticles = allArticles
              .filter(a => (urls as string[]).includes(a.url))
              .map(a => ({ ...a, category }));
            categorizedArticles.push(...categoryArticles);
          }
          
          return new Response(
            JSON.stringify({ 
              articles: categorizedArticles,
              userProfile: userProfile
            }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError, 'Content:', content);
          // Fallback to random articles
          recommendedArticles = allArticles.sort(() => Math.random() - 0.5).slice(0, 16);
        }
      } else {
        console.error('AI API error:', response.status, await response.text());
        // Fallback to random articles
        recommendedArticles = allArticles.sort(() => Math.random() - 0.5).slice(0, 16);
      }
    } else {
      // Not enough history - categorize all available articles
      console.log('Not enough click history, categorizing available articles');
      
      // Categorize articles by keywords
      const categories: Record<string, any[]> = {
        'Politica': [],
        'Politica estera': [],
        'Sport': [],
        'Cultura': []
      };
      
      allArticles.forEach(article => {
        const text = `${article.title} ${article.description || ''}`.toLowerCase();
        
        // Check for international politics first (more specific)
        if (text.match(/guerra|conflitto|ucraina|gaza|israele|palestina|biden|trump|putin|xi jinping|cina|usa america|nato|onu|geopolitica|internazionale|mondiale|esteri/)) {
          categories['Politica estera'].push({ ...article, category: 'Politica estera' });
        }
        // Then Italian politics
        else if (text.match(/governo|ministro|parlamento|meloni|salvini|schlein|conte|partito.*italiano|elezioni.*itali|referendum|camera|senato|quirinale/)) {
          categories['Politica'].push({ ...article, category: 'Politica' });
        }
        // Sports
        else if (text.match(/calcio|serie a|champions|juventus|milan|inter|napoli|roma|lazio|sport|tennis|basket|formula.*1|motogp|olimpi|gara|partita|campionato|atletica|nuoto/)) {
          categories['Sport'].push({ ...article, category: 'Sport' });
        }
        // Culture
        else if (text.match(/cinema|film|teatro|musica|concerto|mostra|arte|libro|lettera|festival|premio|spettacolo|cultura|museo|attore|regista|cantante/)) {
          categories['Cultura'].push({ ...article, category: 'Cultura' });
        }
        // Fallback: distribute to smallest category
        else {
          const smallestCat = Object.entries(categories)
            .reduce((min, [key, val]) => val.length < categories[min].length ? key : min, 'Politica');
          categories[smallestCat].push({ ...article, category: smallestCat });
        }
      });
      
      // Take 4 from each category, or repeat if not enough
      recommendedArticles = [];
      for (const [category, articles] of Object.entries(categories)) {
        const categoryArticles = articles.slice(0, 4);
        // If less than 4, repeat the available ones
        while (categoryArticles.length < 4 && articles.length > 0) {
          categoryArticles.push(articles[categoryArticles.length % articles.length]);
        }
        recommendedArticles.push(...categoryArticles);
      }
      
      recommendedArticles = recommendedArticles.slice(0, 16);
    }

    return new Response(
      JSON.stringify({ 
        articles: recommendedArticles,
        userProfile: clicks && clicks.length >= 5 ? null : "Non abbiamo ancora abbastanza dati per creare il tuo profilo. Continua a leggere articoli per permetterci di conoscerti meglio!"
      }), 
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
