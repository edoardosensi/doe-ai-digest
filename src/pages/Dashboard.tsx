import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Newspaper } from "lucide-react";
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
  const [userProfile, setUserProfile] = useState<string | null>(null);
  
  // Categorize articles into the 4 main categories
  const categorizeArticles = () => {
    const categories: Record<string, Article[]> = {
      'Politica': [],
      'Politica estera': [],
      'Sport': [],
      'Cultura': []
    };
    
    articles.forEach(article => {
      const title = article.title.toLowerCase();
      const desc = article.description?.toLowerCase() || '';
      const text = title + ' ' + desc;
      
      if (text.match(/internazionale|mondo|esteri|usa|cina|russia|europa|onu|nato/)) {
        categories['Politica estera'].push(article);
      } else if (text.match(/governo|politica|elezioni|partito|ministro|parlamento/)) {
        categories['Politica'].push(article);
      } else if (text.match(/sport|calcio|serie a|champions|olimpiadi|tennis|basket/)) {
        categories['Sport'].push(article);
      } else if (text.match(/cultura|cinema|libro|teatro|arte|musica|spettacolo/)) {
        categories['Cultura'].push(article);
      } else {
        // Distribute remaining articles evenly
        const smallestCategory = Object.entries(categories).reduce((min, [key, val]) => 
          val.length < categories[min].length ? key : min, 'Politica'
        );
        categories[smallestCategory].push(article);
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
        setUserProfile(data.userProfile || null);
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
  const categories = ['Politica', 'Politica estera', 'Sport', 'Cultura'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} userProfile={userProfile} />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Testata moderna */}
        <div className="mb-8 pb-6 border-b-2 border-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Newspaper className="w-12 h-12 text-primary" />
              <div>
                <h1 className="text-5xl font-bold tracking-tight">
                  IL QUOTIDIANO
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date().toLocaleDateString('it-IT', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  }).toUpperCase()}
                </p>
              </div>
            </div>
            <Button
              onClick={loadRecommendedArticles}
              disabled={generating}
              size="lg"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              Rigenera
            </Button>
          </div>
        </div>

        {generating ? (
          <div className="text-center py-20">
            <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">L'AI sta selezionando i migliori articoli per te...</p>
          </div>
        ) : articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category) => {
              const categoryArticles = categorizedArticles[category];
              
              return (
                <div key={category} className="space-y-6">
                  <div className="sticky top-20 z-10 bg-background py-2">
                    <h2 className="text-2xl font-bold uppercase tracking-tight border-b-2 border-primary pb-2">
                      {category}
                    </h2>
                  </div>
                  <div className="space-y-6">
                    {categoryArticles.slice(0, 4).map((article) => (
                      <ArticleCard
                        key={article.id}
                        {...article}
                        image_url={article.image_url}
                        onSave={() => handleSaveArticle(article)}
                        onClick={() => handleArticleClick(article)}
                      />
                    ))}
                    {categoryArticles.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        Nessun articolo disponibile
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <Newspaper className="h-16 w-16 mx-auto text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              Nessuna notizia disponibile al momento
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;