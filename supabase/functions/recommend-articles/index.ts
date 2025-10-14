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

    // Get user's interests and existing profile from profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('interests, custom_profile')
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

    // Always try to use AI for recommendations if there are ANY clicks
    if (clicks && clicks.length > 0) {
      // Get existing profile to enhance it
      const existingProfile = profile?.custom_profile || null;
      
      // User has click history - use AI to build/update profile and recommend
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
              content: 'Sei "LA BOLLA" - un intelligenza artificiale avanzata che costruisce e affina continuamente il profilo psicologico del lettore. Sei un esperto di neuroscienze cognitive, psicologia dei consumi mediatici, e giornalismo. Il tuo compito è creare una "bolla informativa personalizzata" sempre più precisa ad ogni interazione.'
            },
            { 
              role: 'user', 
              content: `🧠 LA MIA BOLLA - SISTEMA DI PROFILAZIONE AVANZATA

${existingProfile ? `PROFILO ESISTENTE DA AGGIORNARE:\n${existingProfile}\n\n` : ''}STORICO COMPLETO LETTURE (ultimi ${clicks.length} click):
${clickedArticlesInfo}

🎯 MISSIONE:
1. ANALIZZA PROFONDAMENTE i pattern di lettura:
   - Quali TEMI specifici ricorrono? (non solo categorie, ma sottoargomenti precisi)
   - Quale ANGOLAZIONE preferisce? (tecnica, emotiva, politica, internazionale)
   - Quale COMPLESSITÀ cerca? (analisi profonde, breaking news, curiosità)
   - Quali FONTI predilige? (mainstream, alternativi, esteri)
   - PATTERN TEMPORALI: quando clicca cosa? (progressione interessi)
   - CORRELAZIONI NASCOSTE: quali temi si legano tra loro nei suoi interessi?

2. COSTRUISCI/AGGIORNA "LA BOLLA" (profilo utente di 5-7 righe):
   ${existingProfile ? '- INTEGRA il profilo esistente con nuove intuizioni dai click recenti' : '- CREA un profilo dettagliato iniziale'}
   - Usa linguaggio psicologico preciso e concreto
   - Identifica NON solo "cosa" legge, ma "perché" (motivazioni profonde)
   - Prevedi evoluzione interessi futuri
   - Sii specifico: nomi, temi precisi, non genericità

3. SELEZIONA ARTICOLI PERFETTI:
   Categorie: ${enabledSections.join(', ')}
   - Scegli 4 articoli per categoria che:
     * Matchano PRECISAMENTE il profilo psicologico
     * Offrono sia CONTINUITÀ (interessi noti) che SCOPERTA GUIDATA (nuove prospettive correlate)
     * Evitano ridondanza ma mantengono coerenza tematica
   
REGOLE SPECIALI:
- "Filosofia": SOLO se tratta di filosofi, correnti filosofiche, concetti profondi (etica, metafisica, epistemologia). NO articoli generici.
- Se pochi articoli per una categoria, ripeti i migliori ma SOLO se veramente rilevanti

ARTICOLI DISPONIBILI:
${allArticles.map(a => `URL: ${a.url}\nTitolo: ${a.title}\nDescrizione: ${a.description || 'N/A'}\n---`).join('\n')}

Restituisci SOLO questo JSON (senza markdown):
{
  "articles": {
    ${enabledSections.map(s => `"${s}": ["url1", "url2", "url3", "url4"]`).join(',\n    ')}
  },
  "userProfile": "LA BOLLA: [Profilo dettagliato 5-7 righe che descrive PRECISAMENTE la psicologia del lettore, i suoi interessi profondi, pattern nascosti, e previsioni future. Basato su ${clicks.length} click analizzati. ${existingProfile ? 'Aggiornato e raffinato dal profilo precedente.' : 'Profilo iniziale costruito.'}]"
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

REGOLE SPECIALI PER "Filosofia":
- Assegna questa categoria SOLO ad articoli che trattano ESPLICITAMENTE di:
  * Filosofi e pensatori (Platone, Aristotele, Kant, Nietzsche, ecc.)
  * Correnti filosofiche (stoicismo, esistenzialismo, fenomenologia, ecc.)
  * Concetti filosofici profondi (etica, metafisica, epistemologia, ontologia)
  * Dibattiti filosofici contemporanei
  * Storia della filosofia
- NON assegnare a "Filosofia" articoli generici su politica, cultura o attualità, anche se menzionano "pensiero" o "riflessione"
- Se non ci sono articoli veramente filosofici, NON inventare - lascia la categoria vuota o con meno di 4 articoli

Seleziona ESATTAMENTE 4 articoli per ogni categoria (tranne "Filosofia" che può averne meno se non ci sono contenuti adatti).

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
            'Filosofia': ['filosofia', 'filosofo', 'filosofica', 'filosofico', 'platone', 'aristotele', 'kant', 'nietzsche', 'hegel', 'cartesio', 'stoicismo', 'esistenzialismo', 'fenomenologia', 'etica', 'metafisica', 'epistemologia', 'ontologia'],
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
          'Filosofia': ['filosofia', 'filosofo', 'filosofica', 'filosofico', 'platone', 'aristotele', 'kant', 'nietzsche', 'hegel', 'cartesio', 'stoicismo', 'esistenzialismo', 'fenomenologia', 'etica', 'metafisica', 'epistemologia', 'ontologia'],
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
