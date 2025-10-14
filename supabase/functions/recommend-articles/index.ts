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

    // Get user's click history with full article details
    const { data: clicks } = await supabaseClient
      .from('user_clicks')
      .select('article_id, clicked_at, articles(title, description, source, url, category)')
      .eq('user_id', user.id)
      .order('clicked_at', { ascending: false })
      .limit(50);

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

    // Helper function to return fallback articles filtered by user sections
    const returnFallbackArticles = (message: string) => {
      console.log('Using fallback mode:', message);
      
      // Filter articles by category matching user's enabled sections
      const categorizedFallbackArticles = [];
      
      for (const section of enabledSections) {
        // Try to find articles matching the section name (case-insensitive partial match)
        const sectionArticles = allArticles
          .filter(a => {
            const category = (a.category || '').toLowerCase();
            const sectionLower = section.toLowerCase();
            return category.includes(sectionLower) || sectionLower.includes(category);
          })
          .slice(0, 4) // Take up to 4 articles per section
          .map(a => ({ ...a, category: section }));
        
        categorizedFallbackArticles.push(...sectionArticles);
      }
      
      // If no articles matched by category, just take recent articles and distribute them
      if (categorizedFallbackArticles.length === 0) {
        const articlesPerSection = Math.ceil(16 / enabledSections.length);
        let index = 0;
        
        for (const section of enabledSections) {
          const sectionArticles = allArticles
            .slice(index, index + articlesPerSection)
            .map(a => ({ ...a, category: section }));
          categorizedFallbackArticles.push(...sectionArticles);
          index += articlesPerSection;
        }
      }
      
      return new Response(
        JSON.stringify({ 
          articles: categorizedFallbackArticles.slice(0, 16),
          fallbackMode: true,
          message: message
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    };

    let recommendedArticles = [];

    // Always try to use AI for recommendations if there are ANY clicks
    if (clicks && clicks.length > 0) {
      // Get existing profile to enhance it
      const existingProfile = profile?.custom_profile || null;
      const hasCustomProfile = existingProfile && existingProfile.length > 50; // Assume custom if substantial
      
      // User has click history - use AI to build/update profile and recommend
      const clickedArticlesInfo = clicks
        .map((c: any, idx: number) => {
          const article = c.articles;
          const date = new Date(c.clicked_at).toLocaleDateString('it-IT');
          return `[${idx + 1}] ${article.title}\n   Fonte: ${article.source} | Data click: ${date}\n   Descrizione: ${article.description || 'N/A'}\n   Categoria: ${article.category || 'N/A'}`;
        })
        .join('\n\n');

      // Build the system prompt - different based on whether user has custom profile
      const systemPrompt = hasCustomProfile 
        ? `Sei "LA BOLLA" - un'intelligenza artificiale che DEVE OBBEDIRE ASSOLUTAMENTE al profilo personalizzato dell'utente. 

⚠️ REGOLA ASSOLUTA: L'utente ha definito esplicitamente i suoi interessi e preferenze. Tu DEVI selezionare SOLO articoli che corrispondono ESATTAMENTE a quanto specificato nel profilo utente.

Se l'utente dice "solo articoli su Matteo Renzi", mostri SOLO articoli su Matteo Renzi.
Se l'utente dice "nessun articolo sportivo", NON includi sport.
Se l'utente specifica temi, autori, o angolazioni - rispettali ALLA LETTERA.

Il tuo compito NON è aggiornare il profilo ma APPLICARLO RIGOROSAMENTE nella selezione degli articoli.`
        : `Sei "LA BOLLA" - un'intelligenza artificiale avanzata che costruisce e affina continuamente il profilo psicologico del lettore. Sei un esperto di neuroscienze cognitive, psicologia dei consumi mediatici, e giornalismo. Il tuo compito è creare una "bolla informativa personalizzata" sempre più precisa ad ogni interazione.`;

      const userPrompt = hasCustomProfile
        ? `🎯 PROFILO UTENTE DA RISPETTARE ASSOLUTAMENTE:
${existingProfile}

⚠️ QUESTO PROFILO È STATO PERSONALIZZATO DALL'UTENTE. DEVI OBBEDIRE RIGOROSAMENTE.

📖 Storico letture (per contestualizzare, ma il profilo sopra ha PRIORITÀ):
${clickedArticlesInfo}

🎯 TUO COMPITO:
Seleziona articoli che corrispondono ESATTAMENTE al profilo specificato sopra.

Categorie disponibili: ${enabledSections.join(', ')}

Per ogni categoria seleziona 4 articoli che:
1. Rispettano ALLA LETTERA le preferenze nel profilo utente
2. Se il profilo specifica temi/persone/eventi - SOLO quelli
3. Se il profilo esclude qualcosa - NON includerlo MAI
4. Mantieni coerenza con il profilo in ogni scelta

QUALITÀ > QUANTITÀ: Se pochi articoli matchano il profilo, meglio lasciare categorie vuote.

ARTICOLI DISPONIBILI:
${allArticles.map(a => `URL: ${a.url}\nTitolo: ${a.title}\nDescrizione: ${a.description || 'N/A'}\n---`).join('\n')}

Restituisci SOLO questo JSON (senza markdown):
{
  "articles": {
    ${enabledSections.map(s => `"${s}": ["url1", "url2", "url3", "url4"]`).join(',\n    ')}
  },
  "userProfile": "${existingProfile.replace(/"/g, '\\"')}"
}`
        : `🧠 LA MIA BOLLA - SISTEMA DI PROFILAZIONE AVANZATA

${existingProfile ? `📊 PROFILO ESISTENTE DA AGGIORNARE:\n${existingProfile}\n\n` : ''}📖 STORICO COMPLETO LETTURE (ultimi ${clicks.length} articoli cliccati):

${clickedArticlesInfo}

🎯 MISSIONE DI ANALISI PROFONDA:

1. ANALISI MULTI-DIMENSIONALE DEI PATTERN:
   
   a) TEMI E SOTTOARGOMENTI:
      - Identifica i temi ricorrenti specifici (es: "politica economica UE", "AI e neuroscienze", "conflitti geopolitici")
      - Rileva sottoargomenti emergenti e correlazioni tra diversi ambiti
      - Nota eventuali "ossessioni informative" (temi cercati ripetutamente)
   
   b) ANGOLAZIONE E PROSPETTIVA:
      - Preferisce analisi tecniche, emotivo-narrative, o politically-charged?
      - Cerca diverse fonti/prospettive o conferma preesistenti visioni?
      - Tipo di linguaggio: accademico, giornalistico mainstream, alternative media?
   
   c) PROFONDITÀ E COMPLESSITÀ:
      - Breaking news vs approfondimenti lunghi?
      - Fact-based reporting vs opinion pieces?
      - Livello di specializzazione: generalista, semi-esperto, esperto?
   
   d) FONTI E CREDIBILITÀ:
      - Quali testate predilige? (mainstream italiane, internazionali, alternative)
      - Pattern di fiducia: fonti ufficiali vs indipendenti?
   
   e) CRONOLOGIA E EVOLUZIONE:
      - Come cambiano gli interessi nel tempo? (ultime 50 letture)
      - Ci sono "fasi" o "cicli" tematici?
      - Eventi trigger che spostano l'attenzione?
   
   f) PSICOLOGIA DEL LETTORE:
      - Cerca conferme (echo chamber) o sfide cognitive?
      - Motivazione: informarsi, capire, agire, evadere?
      - Livello di engagement emotivo vs razionale

2. COSTRUZIONE/AGGIORNAMENTO "LA BOLLA" (7-10 righe, linguaggio preciso):
   
   ${existingProfile ? '- INTEGRA il profilo precedente con nuove scoperte dai click recenti\n   - Evidenzia CAMBIAMENTI e CONTINUITÀ' : '- CREA un profilo psicologico iniziale dettagliato'}
   - Usa terminologia precisa (no genericità tipo "interessato alla politica")
   - Esempio GOOD: "Ossessione per dinamiche israelo-palestinesi, focus su violazioni diritti umani, fonti dirette Al Jazeera"
   - Esempio BAD: "Interessato alla politica internazionale"
   - Identifica MOTIVAZIONI PROFONDE: perché legge quello che legge?
   - PREDICI con precisione: cosa cercherà nei prossimi giorni/settimane?
   - Sii CONCRETO: nomi, eventi, testate, temi specifici

3. SELEZIONE ARTICOLI IPER-PERSONALIZZATI:
   
   Categorie disponibili: ${enabledSections.join(', ')}
   
   Per ogni categoria seleziona 4 articoli che:
   
   a) PRECISIONE PSICOLOGICA:
      - Matchano ESATTAMENTE il profilo costruito sopra
      - Considerano sottotemi, angolazioni, fonti preferite
      - Rispettano il livello di complessità desiderato
   
   b) BILANCIAMENTO STRATEGICO:
      - 2-3 articoli: CONTINUITÀ (interessi consolidati, comfort zone)
      - 1-2 articoli: SCOPERTA GUIDATA (nuove prospettive correlate ai suoi interessi)
      - Evita ripetitività ma mantieni coerenza tematica
   
   c) QUALITÀ > QUANTITÀ:
      - Se pochi articoli adatti in una categoria, meglio meno articoli buoni che forzature
      - Ripeti un articolo eccellente piuttosto che inserirne uno non pertinente
   
   REGOLE CATEGORIALI SPECIALI:
   - "Filosofia": SOLO articoli su filosofi, correnti, concetti filosofici profondi (etica, metafisica, epistemologia). NO generalizzazioni.
   - Ogni articolo deve "parlare" al profilo psicologico specifico dell'utente

ARTICOLI DISPONIBILI:
${allArticles.map(a => `URL: ${a.url}\nTitolo: ${a.title}\nDescrizione: ${a.description || 'N/A'}\n---`).join('\n')}

Restituisci SOLO questo JSON (senza markdown):
{
  "articles": {
    ${enabledSections.map(s => `"${s}": ["url1", "url2", "url3", "url4"]`).join(',\n    ')}
  },
  "userProfile": "LA BOLLA: [Profilo dettagliato 5-7 righe che descrive PRECISAMENTE la psicologia del lettore, i suoi interessi profondi, pattern nascosti, e previsioni future. Basato su ${clicks.length} click analizzati. ${existingProfile ? 'Aggiornato e raffinato dal profilo precedente.' : 'Profilo iniziale costruito.'}]"
}`;

      try {
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
                content: systemPrompt
              },
              { 
                role: 'user', 
                content: userPrompt
              }
            ],
          }),
        });

        if (response.status === 402) {
          // AI credits exhausted - return fallback immediately
          return returnFallbackArticles('Crediti AI esauriti. Mostrando articoli recenti.');
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI API error:', response.status, errorText);
          return returnFallbackArticles('Errore temporaneo. Mostrando articoli recenti.');
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const aiResponse = JSON.parse(content);
        const categorizedUrls = aiResponse.articles;
        const userProfile = aiResponse.userProfile;
        
        // Save the AI-generated profile to the database ONLY if user hasn't customized it
        if (userProfile && !hasCustomProfile) {
          const { error: profileError } = await supabaseClient
            .from('profiles')
            .update({ custom_profile: userProfile })
            .eq('user_id', user.id);
          
          if (profileError) {
            console.error('Error updating user profile:', profileError);
          } else {
            console.log('User profile updated successfully');
          }
        } else if (hasCustomProfile) {
          console.log('User has custom profile - skipping auto-update to preserve user preferences');
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
      } catch (error) {
        console.error('AI processing error:', error);
        return returnFallbackArticles('Errore temporaneo. Mostrando articoli recenti.');
      }
    } else {
      // Not enough history - use AI to categorize or fallback
      console.log('Not enough click history, using AI to categorize articles');
      
      try {
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

        if (response.status === 402) {
          // AI credits exhausted - return fallback immediately
          return returnFallbackArticles('Crediti AI esauriti. Mostrando articoli recenti.');
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI API error:', response.status, errorText);
          return returnFallbackArticles('Errore temporaneo. Mostrando articoli recenti.');
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
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
      } catch (error) {
        console.error('AI categorization error:', error);
        return returnFallbackArticles('Errore temporaneo. Mostrando articoli recenti.');
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
