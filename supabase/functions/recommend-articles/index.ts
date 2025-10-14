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

    // Get user's enabled sections
    const { data: userSections } = await supabaseClient
      .from('user_sections')
      .select('section_name')
      .eq('user_id', user.id)
      .eq('enabled', true);
    
    // Use user's sections or default ones
    const enabledSections = userSections && userSections.length > 0
      ? userSections.map(s => s.section_name)
      : ['Politica', 'Politica estera', 'Sport', 'Cultura'];
    
    console.log('User enabled sections:', enabledSections);

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
              content: 'Sei un esperto giornalista italiano specializzato nella categorizzazione di notizie e nella profilazione dei lettori. Devi analizzare attentamente gli articoli letti dall\'utente per comprendere i suoi interessi profondi e selezionare contenuti perfettamente allineati.'
            },
            { 
              role: 'user', 
              content: `STORICO LETTURE UTENTE: ${clickedArticlesInfo}

COMPITO: Analizza i pattern negli articoli che l'utente ha letto e:
1. Crea un profilo dettagliato e acuto dell'utente (3-4 righe) che descriva:
   - I suoi interessi specifici
   - Il tipo di approfondimento che cerca (notizie veloci vs analisi)
   - I temi ricorrenti che lo attraggono
   - Lo stile di giornalismo che preferisce

2. Seleziona ESATTAMENTE 4 articoli per ogni categoria che MEGLIO si allineano al profilo.
   Le categorie disponibili sono: ${enabledSections.join(', ')}

CRITERI DI SELEZIONE:
- Priorità assoluta: articoli che matchano gli interessi dimostrati nei click
- Analizza titolo E descrizione per categorizzare correttamente
- Evita articoli troppo generici, cerca quelli con un taglio specifico
- Bilancia tra continuità (temi già letti) e scoperta (nuovi angoli correlati)

ARTICOLI DISPONIBILI:
${allArticles.map(a => `URL: ${a.url}\nTitolo: ${a.title}\nDescrizione: ${a.description || 'N/A'}\n---`).join('\n')}

IMPORTANTE: Se ci sono pochi articoli per una categoria, ripeti i migliori disponibili.

Restituisci SOLO questo JSON (senza markdown):
{
  "articles": {
    ${enabledSections.map(s => `"${s}": ["url1", "url2", "url3", "url4"]`).join(',\n    ')}
  },
  "userProfile": "Descrizione italiana di 3-4 righe che delinea precisamente gli interessi dell'utente basandosi sui suoi click. Usa termini specifici e concreti, non generici."
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
          
          // Save the AI-generated profile to the database
          if (userProfile) {
            const { error: profileError } = await supabaseClient
              .from('profiles')
              .update({ custom_profile: userProfile })
              .eq('user_id', user.id);
            
            if (profileError) {
              console.error('Error updating user profile:', profileError);
            } else {
              console.log('User profile updated successfully');
            }
          }
          
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
      // Not enough history - use AI to categorize based on titles
      console.log('Not enough click history, using AI to categorize articles');
      
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
              content: 'Sei un esperto giornalista italiano. Devi categorizzare accuratamente gli articoli di notizie in base al loro titolo e descrizione.'
            },
            { 
              role: 'user', 
              content: `Categorizza questi articoli nelle categorie abilitate dall'utente: ${enabledSections.join(', ')}

Analizza ATTENTAMENTE il titolo e la descrizione di ogni articolo per determinare la categoria corretta.
Seleziona ESATTAMENTE 4 articoli per ogni categoria. Se ci sono pochi articoli per una categoria, ripeti i migliori disponibili.

ARTICOLI DISPONIBILI:
${allArticles.map(a => `URL: ${a.url}\nTitolo: ${a.title}\nDescrizione: ${a.description || 'N/A'}\n---`).join('\n')}

Restituisci SOLO questo JSON (senza markdown):
{
  "articles": {
    ${enabledSections.map(s => `"${s}": ["url1", "url2", "url3", "url4"]`).join(',\n    ')}
  }
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
          
          // Build categorized articles array with category tag
          recommendedArticles = [];
          for (const [category, urls] of Object.entries(categorizedUrls)) {
            const categoryArticles = allArticles
              .filter(a => (urls as string[]).includes(a.url))
              .map(a => ({ ...a, category }));
            recommendedArticles.push(...categoryArticles);
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError, 'Content:', content);
          // Fallback to keyword-based categorization
          const categories: Record<string, any[]> = {};
          enabledSections.forEach(s => categories[s] = []);
          
          const keywords: Record<string, string[]> = {
            'Politica': ['governo', 'ministro', 'parlamento', 'meloni', 'salvini', 'elezioni', 'partito'],
            'Politica estera': ['guerra', 'ucraina', 'gaza', 'nato', 'biden', 'trump', 'putin'],
            'Sport': ['calcio', 'tennis', 'serie a', 'champions', 'milan', 'inter', 'juventus'],
            'Cultura': ['cinema', 'film', 'teatro', 'musica', 'arte', 'festival'],
            'Roma': ['roma', 'campidoglio', 'comune', 'gualtieri'],
            'Filosofia': ['filosofia', 'filosofo', 'pensiero'],
            'Scienza': ['scienza', 'ricerca', 'studio', 'scoperta'],
            'Televisione': ['televisione', 'tv', 'rai', 'mediaset'],
            'Stampa internazionale': ['internazionale', 'esteri', 'mondo']
          };
          
          allArticles.forEach(article => {
            const text = `${article.title} ${article.description || ''}`.toLowerCase();
            let assigned = false;
            
            for (const section of enabledSections) {
              const sectionKeywords = keywords[section] || [];
              if (sectionKeywords.some(kw => text.includes(kw))) {
                categories[section].push({ ...article, category: section });
                assigned = true;
                break;
              }
            }
            
            if (!assigned && enabledSections.length > 0) {
              const smallestCat = Object.entries(categories)
                .reduce((min, [key, val]) => val.length < categories[min].length ? key : min, enabledSections[0]);
              categories[smallestCat].push({ ...article, category: smallestCat });
            }
          });
          
          recommendedArticles = [];
          for (const [category, articles] of Object.entries(categories)) {
            const categoryArticles = articles.slice(0, 4);
            while (categoryArticles.length < 4 && articles.length > 0) {
              categoryArticles.push(articles[categoryArticles.length % articles.length]);
            }
            recommendedArticles.push(...categoryArticles);
          }
          recommendedArticles = recommendedArticles.slice(0, enabledSections.length * 4);
        }
      } else {
        console.error('AI API error:', response.status, await response.text());
        // Fallback to keyword-based categorization
        const categories: Record<string, any[]> = {};
        enabledSections.forEach(s => categories[s] = []);
        
        const keywords: Record<string, string[]> = {
          'Politica': ['governo', 'ministro', 'parlamento', 'meloni', 'salvini', 'elezioni', 'partito'],
          'Politica estera': ['guerra', 'ucraina', 'gaza', 'nato', 'biden', 'trump', 'putin'],
          'Sport': ['calcio', 'tennis', 'serie a', 'champions', 'milan', 'inter', 'juventus'],
          'Cultura': ['cinema', 'film', 'teatro', 'musica', 'arte', 'festival'],
          'Roma': ['roma', 'campidoglio', 'comune', 'gualtieri'],
          'Filosofia': ['filosofia', 'filosofo', 'pensiero'],
          'Scienza': ['scienza', 'ricerca', 'studio', 'scoperta'],
          'Televisione': ['televisione', 'tv', 'rai', 'mediaset'],
          'Stampa internazionale': ['internazionale', 'esteri', 'mondo']
        };
        
        allArticles.forEach(article => {
          const text = `${article.title} ${article.description || ''}`.toLowerCase();
          let assigned = false;
          
          for (const section of enabledSections) {
            const sectionKeywords = keywords[section] || [];
            if (sectionKeywords.some(kw => text.includes(kw))) {
              categories[section].push({ ...article, category: section });
              assigned = true;
              break;
            }
          }
          
          if (!assigned && enabledSections.length > 0) {
            const smallestCat = Object.entries(categories)
              .reduce((min, [key, val]) => val.length < categories[min].length ? key : min, enabledSections[0]);
            categories[smallestCat].push({ ...article, category: smallestCat });
          }
        });
        
        recommendedArticles = [];
        for (const [category, articles] of Object.entries(categories)) {
          const categoryArticles = articles.slice(0, 4);
          while (categoryArticles.length < 4 && articles.length > 0) {
            categoryArticles.push(articles[categoryArticles.length % articles.length]);
          }
          recommendedArticles.push(...categoryArticles);
        }
        recommendedArticles = recommendedArticles.slice(0, enabledSections.length * 4);
      }
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
