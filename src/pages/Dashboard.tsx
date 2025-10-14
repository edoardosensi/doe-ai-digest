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

interface SavedArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source?: string;
  saved_at: string;
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
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  
  // Load user's enabled sections and saved articles
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      // Load sections
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
      
      // Load saved articles
      loadSavedArticles();
    };
    
    loadUserData();
  }, [user]);
  
  const loadSavedArticles = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('saved_articles')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });
    
    if (error) {
      console.error('Error loading saved articles:', error);
      return;
    }
    
    if (data) {
      setSavedArticles(data);
    }
  };
  
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
      
      console.log('Article click tracked, AI will use this to refine your bubble');
      
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
      
      // Reload saved articles
      loadSavedArticles();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile salvare l'articolo",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteSavedArticle = async (articleId: string) => {
    try {
      const { error } = await supabase
        .from('saved_articles')
        .delete()
        .eq('id', articleId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Rimosso!",
        description: "Articolo rimosso dai salvati",
      });
      
      // Reload saved articles
      loadSavedArticles();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile rimuovere l'articolo",
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
        {/* Articoli Salvati */}
        {savedArticles.length > 0 && (
          <div className="mb-8 bg-accent/10 rounded-lg p-6 border-2 border-accent">
            <h2 className="text-2xl font-heading font-bold mb-4 flex items-center gap-2">
              <Newspaper className="w-6 h-6" />
              Articoli Salvati
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedArticles.slice(0, 3).map((article) => (
                <ArticleCard
                  key={article.id}
                  title={article.title}
                  description={article.description || ''}
                  url={article.url}
                  source={article.source || ''}
                  onClick={() => window.open(article.url, '_blank')}
                  showSaveButton={false}
                />
              ))}
            </div>
            {savedArticles.length > 3 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                +{savedArticles.length - 3} altri articoli salvati
              </p>
            )}
          </div>
        )}
        
        {/* Testata stile giornale */}
        <div className="mb-8 pb-6 border-b-2 border-primary">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <Newspaper className="w-10 h-10 sm:w-12 sm:h-12 text-primary flex-shrink-0" />
              <div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold tracking-tight">
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
            {categories.map((category) => {
              const categoryArticles = categorizedArticles[category];
              
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