import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavedArticle {
  id: string;
  title: string;
  description?: string;
  url: string;
  source?: string;
  saved_at: string;
}

interface SavedArticlesDialogProps {
  userId: string;
}

export const SavedArticlesDialog = ({ userId }: SavedArticlesDialogProps) => {
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      loadSavedArticles();
    }
  }, [open, userId]);

  const loadSavedArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_articles")
        .select("*")
        .eq("user_id", userId)
        .order("saved_at", { ascending: false });

      if (error) throw error;
      setSavedArticles(data || []);
    } catch (error) {
      console.error("Error loading saved articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (articleId: string) => {
    try {
      const { error } = await supabase
        .from("saved_articles")
        .delete()
        .eq("id", articleId)
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Rimosso!",
        description: "Articolo rimosso dai salvati",
      });

      // Reload articles
      loadSavedArticles();
    } catch (error) {
      console.error("Error deleting article:", error);
      toast({
        title: "Errore",
        description: "Impossibile rimuovere l'articolo",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Bookmark className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Articoli Salvati</DialogTitle>
          <DialogDescription>
            Tutti gli articoli che hai salvato
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            {savedArticles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessun articolo salvato
              </p>
            ) : (
              <div className="space-y-4">
                {savedArticles.map((article) => (
                  <div
                    key={article.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <h3 className="font-semibold mb-1 hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        {article.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {article.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{article.source}</span>
                          <span>{formatDate(article.saved_at)}</span>
                        </div>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(article.id)}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
