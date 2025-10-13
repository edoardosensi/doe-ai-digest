import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Article {
  title: string;
  description: string;
  url: string;
  source?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [interests, setInterests] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const generateSuggestions = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-articles', {
        body: { interests: interests || 'tecnologia, scienza, cultura' }
      });

      if (error) throw error;

      if (data?.articles) {
        setArticles(data.articles);
        toast({
          title: "Articoli generati!",
          description: `Ecco ${data.articles.length} articoli selezionati per te`,
        });
      }
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "Errore",
        description: "Impossibile generare suggerimenti",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/10">
      <Navbar user={user} />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              I Tuoi Articoli Personalizzati
            </h1>
            <p className="text-muted-foreground">
              Lascia che l'AI ti suggerisca contenuti interessanti
            </p>
          </div>

          {/* Interest Input */}
          <div className="flex gap-2 max-w-2xl mx-auto">
            <Input
              placeholder="Es: tecnologia, scienza, cultura..."
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateSuggestions()}
            />
            <Button 
              onClick={generateSuggestions}
              disabled={generating}
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Genera
            </Button>
          </div>

          {/* Articles Grid */}
          {articles.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {articles.map((article, index) => (
                <ArticleCard
                  key={index}
                  {...article}
                  onSave={() => handleSaveArticle(article)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Inserisci i tuoi interessi e genera suggerimenti personalizzati
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;