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
  category?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [generating, setGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState<string | null>(null);
  const [enabledSections, setEnabledSections] = useState<string[]>([]);
  
  // Load user's enabled sections
  useEffect(() => {
    const loadSections = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_sections')
        .select('section_name')
        .eq('user_id', user.id)
        .eq('enabled', true);
      
      if (data && data.length > 0) {
        setEnabledSections(data.map(s => s.section_name));
      } else {
        // Default sections if user hasn't configured any
        setEnabledSections(['Politica', 'Politica estera', 'Sport', 'Cultura']);
      }
    };
    
    loadSections();
  }, [user]);
  
  // Use AI-provided categories directly from backend and filter by user sections
  const categorizeArticles = () => {
    const categories: Record<string, Article[]> = {};
    
    // Initialize only enabled sections
    enabledSections.forEach(section => {
      categories[section] = [];
    });
    
    // Use the category already assigned by the AI in the backend
    articles.forEach(article => {
      if (article.category && categories[article.category]) {
        categories[article.category].push(article);
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
    if (!user) {
      console.log('User not loaded yet, skipping article load');
      return;
    }
    
    setGenerating(true);
    try {
      // First, fetch new articles from RSS feeds
      await supabase.functions.invoke('fetch-articles');
      
      // Then get personalized recommendations (AI will update profile automatically)
      const { data, error } = await supabase.functions.invoke('recommend-articles');

      if (error) throw error;

      if (data?.articles) {
        setArticles(data.articles);
        setUserProfile(data.userProfile || null);
      }
      
      // Reload custom profile to get the AI-updated version
      const { data: profileData } = await supabase
        .from('profiles')
        .select('custom_profile')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileData?.custom_profile) {
        setUserProfile(profileData.custom_profile);
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
      // Track the click - this will help AI learn user preferences
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} userProfile={userProfile} />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Testata stile giornale */}
        <div className="mb-8 pb-6 border-b-2 border-primary">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Newspaper className="w-10 h-10 sm:w-12 sm:h-12 text-primary flex-shrink-0" />
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight">
                  Doe
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 italic">
                  {new Date().toLocaleDateString('it-IT', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <Button
              onClick={loadRecommendedArticles}
              disabled={generating}
              size="lg"
              className="gap-2 w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generazione...' : 'Rigenera'}
            </Button>
          </div>
        </div>

        {generating ? (
          <div className="text-center py-20">
            <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground font-serif">Caricamento notizie in corso...</p>
          </div>
        ) : articles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
            {enabledSections.map((category) => {
              const categoryArticles = categorizedArticles[category] || [];
              
              // Skip sections with no articles
              if (categoryArticles.length === 0) return null;
              
              return (
                <div key={category} className="flex flex-col">
                  <div className="pb-4 mb-6 border-b-2 border-primary">
                    <h2 className="text-xl sm:text-2xl font-heading font-bold uppercase tracking-tight">
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
            <p className="text-lg text-muted-foreground font-serif">
              Nessuna notizia disponibile al momento
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;