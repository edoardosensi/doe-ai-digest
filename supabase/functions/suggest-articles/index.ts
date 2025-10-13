import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { interests } = await req.json();
    console.log('Generating article suggestions for interests:', interests);

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
            content: 'Sei un assistente esperto che suggerisce articoli interessanti da leggere basandosi sugli interessi dell\'utente. Restituisci SOLO un array JSON valido con 5-8 articoli, senza testo aggiuntivo.'
          },
          { 
            role: 'user', 
            content: `Suggerisci articoli interessanti su questi argomenti: ${interests || 'tecnologia, scienza, cultura'}. 
            
Restituisci SOLO un array JSON in questo formato esatto, senza markdown o testo extra:
[
  {
    "title": "Titolo articolo",
    "description": "Breve descrizione dell'articolo",
    "url": "https://example.com/article",
    "source": "Nome della fonte"
  }
]

Usa URL reali di siti famosi come Medium, The Verge, Wired, TechCrunch, etc.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate suggestions' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('AI response received');
    
    let content = data.choices[0].message.content;
    console.log('Raw content:', content);
    
    // Clean up the response - remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let articles;
    try {
      articles = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Content:', content);
      // Fallback articles if parsing fails
      articles = [
        {
          title: "Il Futuro dell'Intelligenza Artificiale",
          description: "Un'analisi approfondita delle tendenze emergenti nell'AI",
          url: "https://www.wired.com/tag/artificial-intelligence/",
          source: "Wired"
        },
        {
          title: "Innovazioni nella Tecnologia Quantistica",
          description: "Come i computer quantistici stanno rivoluzionando il calcolo",
          url: "https://www.technologyreview.com/topic/computing/quantum-computing/",
          source: "MIT Technology Review"
        }
      ];
    }

    return new Response(
      JSON.stringify({ articles }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in suggest-articles function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});