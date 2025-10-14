import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RSS_FEEDS = {
  // News generali
  'Repubblica': 'https://www.repubblica.it/rss/homepage/rss2.0.xml',
  'Corriere della Sera': 'https://www.corriere.it/rss/homepage.xml',
  'ANSA': 'https://www.ansa.it/sito/ansait_rss.xml',
  
  // Sport
  'Repubblica Sport': 'https://www.repubblica.it/rss/sport/rss2.0.xml',
  'Corriere Sport': 'https://www.corriere.it/rss/sport.xml',
  'La Gazzetta dello Sport': 'https://www.gazzetta.it/rss/home.xml',
  'Sky Sport': 'https://sport.sky.it/rss/sport.xml',
  
  // Cultura e Spettacoli
  'Repubblica Spettacoli': 'https://www.repubblica.it/rss/spettacoli/rss2.0.xml',
  'Corriere Spettacoli': 'https://www.corriere.it/rss/spettacoli.xml',
  'ANSA Cultura': 'https://www.ansa.it/sito/notizie/cultura/cultura_rss.xml',
  
  // Politica
  'ANSA Politica': 'https://www.ansa.it/sito/notizie/politica/politica_rss.xml',
  'Repubblica Politica': 'https://www.repubblica.it/rss/politica/rss2.0.xml',
};

interface Article {
  title: string;
  description: string;
  url: string;
  image_url?: string;
  source: string;
  published_at: string;
}

async function parseRSSFeed(url: string, source: string): Promise<Article[]> {
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    const items: Article[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(text)) !== null && items.length < 10) {
      const item = match[1];
      
      const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/.exec(item);
      const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/.exec(item);
      const linkMatch = /<link>(.*?)<\/link>/.exec(item);
      const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(item);
      
      // Try to find image in different possible locations
      const imageMatch = /<media:content.*?url="(.*?)"/.exec(item) || 
                        /<enclosure.*?url="(.*?)"/.exec(item) ||
                        /<media:thumbnail.*?url="(.*?)"/.exec(item) ||
                        /<image>(.*?)<\/image>/.exec(item);
      
      const title = titleMatch ? (titleMatch[1] || titleMatch[2]) : '';
      const description = descMatch ? (descMatch[1] || descMatch[2]) : '';
      const url = linkMatch ? linkMatch[1] : '';
      
      if (title && url) {
        items.push({
          title: title.replace(/<[^>]*>/g, '').trim(),
          description: description.replace(/<[^>]*>/g, '').substring(0, 200).trim(),
          url: url.trim(),
          image_url: imageMatch ? imageMatch[1] : undefined,
          source,
          published_at: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString()
        });
      }
    }
    
    return items;
  } catch (error) {
    console.error(`Error parsing RSS feed for ${source}:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching articles from RSS feeds...');
    
    const allArticles: Article[] = [];
    
    // Fetch from all RSS feeds in parallel
    const fetchPromises = Object.entries(RSS_FEEDS).map(([source, url]) => 
      parseRSSFeed(url, source)
    );
    
    const results = await Promise.all(fetchPromises);
    results.forEach(articles => allArticles.push(...articles));
    
    console.log(`Fetched ${allArticles.length} articles`);

    // Insert articles into database (ignore duplicates)
    if (allArticles.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('articles')
        .upsert(allArticles, { onConflict: 'url', ignoreDuplicates: true });
      
      if (insertError) {
        console.error('Error inserting articles:', insertError);
      } else {
        console.log('Articles inserted successfully');
      }
    }

    return new Response(
      JSON.stringify({ success: true, count: allArticles.length }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in fetch-articles function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
