import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Newspaper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  image_url?: string;
  published_at?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [generating, setGenerating] = useState(false);
  
  // Categorize articles
  const categorizeArticles = () => {
    const categories: Record<string, Article[]> = {
      'Politica': [],
      'Cronaca': [],
      'Economia': [],
      'Sport': [],
      'Tecnologia': [],
      'Cultura': [],
      'Altro': []
    };
    
    articles.forEach(article => {
      const title = article.title.toLowerCase();
      const desc = article.description?.toLowerCase() || '';
      const text = title + ' ' + desc;
      
      if (text.match(/governo|politica|elezioni|partito|ministro|parlamento/)) {
        categories['Politica'].push(article);
      } else if (text.match(/cronaca|incidente|arresto|crimine|polizia|carabinieri/)) {
        categories['Cronaca'].push(article);
      } else if (text.match(/economia|mercato|borsa|impresa|industria|pil/)) {
        categories['Economia'].push(article);
      } else if (text.match(/sport|calcio|serie a|champions|olimpiadi|tennis/)) {
        categories['Sport'].push(article);
      } else if (text.match(/tecnologia|digitale|smartphone|app|software|internet/)) {
        categories['Tecnologia'].push(article);
      } else if (text.match(/cultura|cinema|libro|teatro|arte|musica/)) {
        categories['Cultura'].push(article);
      } else {
        categories['Altro'].push(article);
      }
    });
    
    return categories;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadRecommendedArticles();
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadRecommendedArticles();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadRecommendedArticles = async () => {
    setGenerating(true);
    try {
      // First, fetch new articles from RSS feeds
      await supabase.functions.invoke('fetch-articles');
      
      // Then get personalized recommendations
      const { data, error } = await supabase.functions.invoke('recommend-articles');

      if (error) throw error;

      if (data?.articles) {
        setArticles(data.articles);
      }
    } catch (error: any) {
      console.error('Error loading articles:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli articoli",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleArticleClick = async (article: Article) => {
    try {
      // Track the click
      await supabase.functions.invoke('track-click', {
        body: { articleId: article.id }
      });
      
      // Open article in new tab
      window.open(article.url, '_blank');
    } catch (error: any) {
      console.error('Error tracking click:', error);
      // Still open the article even if tracking fails
      window.open(article.url, '_blank');
    }
  };

  const handleSaveArticle = async (article: Article) => {
    try {
      const { error } = await supabase
        .from('saved_articles')
        .insert([{
          user_id: user.id,
          title: article.title,
          url: article.url,
          description: article.description,
          source: article.source
        }]);

      if (error) throw error;

      toast({
        title: "Salvato!",
        description: "Articolo aggiunto ai preferiti",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile salvare l'articolo",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const categorizedArticles = categorizeArticles();
  const mainCategories = ['Politica', 'Cronaca', 'Economia', 'Sport'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <main className="container mx-auto px-4 pt-20 pb-12">
        {/* Testata Giornalistica */}
        <div className="border-y-4 border-foreground py-6 mb-8">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <Separator className="flex-1 bg-foreground" />
              <Newspaper className="h-8 w-8 text-foreground" />
              <Separator className="flex-1 bg-foreground" />
            </div>
            <h1 className="text-6xl font-serif font-black text-foreground tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
              DOE.ONL
            </h1>
            <p className="text-sm font-serif italic text-muted-foreground">
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Separator className="flex-1 bg-foreground" />
              <span className="text-xs font-serif text-muted-foreground">★ EDIZIONE PERSONALIZZATA ★</span>
              <Separator className="flex-1 bg-foreground" />
            </div>
          </div>
        </div>

        {/* Pulsante Aggiorna */}
        <div className="flex justify-center mb-8">
          <Button 
            onClick={loadRecommendedArticles}
            disabled={generating}
            variant="outline"
            className="gap-2 border-2 border-foreground font-serif"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Aggiorna Notizie
          </Button>
        </div>

        {articles.length > 0 ? (
          <div className="space-y-12">
            {/* Sezioni Principali */}
            {mainCategories.map((category) => {
              const categoryArticles = categorizedArticles[category];
              if (categoryArticles.length === 0) return null;
              
              return (
                <section key={category} className="space-y-4">
                  <div className="border-b-2 border-foreground pb-2">
                    <h2 className="text-3xl font-serif font-bold text-foreground uppercase tracking-wide">
                      {category}
                    </h2>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryArticles.slice(0, 3).map((article) => (
                      <ArticleCard
                        key={article.id}
                        {...article}
                        image_url={article.image_url}
                        onSave={() => handleSaveArticle(article)}
                        onClick={() => handleArticleClick(article)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Altre Sezioni */}
            {['Tecnologia', 'Cultura', 'Altro'].map((category) => {
              const categoryArticles = categorizedArticles[category];
              if (categoryArticles.length === 0) return null;
              
              return (
                <section key={category} className="space-y-4">
                  <div className="border-b border-foreground pb-2">
                    <h3 className="text-2xl font-serif font-bold text-foreground uppercase">
                      {category}
                    </h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {categoryArticles.slice(0, 2).map((article) => (
                      <ArticleCard
                        key={article.id}
                        {...article}
                        image_url={article.image_url}
                        onSave={() => handleSaveArticle(article)}
                        onClick={() => handleArticleClick(article)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 space-y-4 border-2 border-dashed border-foreground/30 rounded p-8">
            <Newspaper className="h-16 w-16 mx-auto text-muted-foreground" />
            <p className="text-lg font-serif text-foreground">
              {generating ? "Caricamento delle notizie in corso..." : "Nessuna notizia disponibile al momento"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;