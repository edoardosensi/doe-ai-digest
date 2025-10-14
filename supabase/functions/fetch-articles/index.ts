import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    // Load RSS feeds from database
    const { data: rssFeeds, error: feedsError } = await supabaseClient
      .from('rss_feeds')
      .select('name, url')
      .eq('enabled', true)
      .eq('is_default', true);
    
    if (feedsError) {
      console.error('Error loading RSS feeds:', feedsError);
      throw feedsError;
    }
    
    if (!rssFeeds || rssFeeds.length === 0) {
      console.log('No RSS feeds found');
      return new Response(
        JSON.stringify({ success: true, count: 0 }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Loading ${rssFeeds.length} RSS feeds`);
    
    const allArticles: Article[] = [];
    
    // Fetch from all RSS feeds in parallel
    const fetchPromises = rssFeeds.map(feed => 
      parseRSSFeed(feed.url, feed.name)
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
