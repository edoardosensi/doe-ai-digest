import { useState, useEffect } from "react";
import { Archive, Trash2 } from "lucide-react";
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClickedArticle {
  id: string;
  article_id: string;
  clicked_at: string;
  articles?: {
    title: string;
    url: string;
    source: string;
    description?: string;
  };
}

interface ClickedArticlesDialogProps {
  userId: string;
}

export const ClickedArticlesDialog = ({ userId }: ClickedArticlesDialogProps) => {
  const [clickedArticles, setClickedArticles] = useState<ClickedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      loadClickedArticles();
    }
  }, [open, userId]);

  const loadClickedArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_clicks")
        .select(`
          id,
          article_id,
          clicked_at,
          articles:article_id (
            title,
            url,
            source,
            description
          )
        `)
        .eq("user_id", userId)
        .order("clicked_at", { ascending: false });

      if (error) throw error;
      setClickedArticles(data || []);
    } catch (error) {
      console.error("Error loading clicked articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (clickId: string) => {
    try {
      const { error } = await supabase
        .from("user_clicks")
        .delete()
        .eq("id", clickId);

      if (error) throw error;

      setClickedArticles(prev => prev.filter(click => click.id !== clickId));
      toast({
        title: "Eliminato!",
        description: "Articolo rimosso dall'archivio",
      });
    } catch (error) {
      console.error("Error deleting click:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'articolo",
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
          <Archive className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Archivio Articoli</DialogTitle>
          <DialogDescription>
            Tutti gli articoli che hai letto
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            {clickedArticles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessun articolo ancora letto
              </p>
            ) : (
              <div className="space-y-4">
                {clickedArticles.map((click) => (
                  <div
                    key={click.id}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors"
                  >
                    <div className="flex gap-3">
                      <a
                        href={click.articles?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <h3 className="font-semibold mb-1 hover:text-primary transition-colors">
                          {click.articles?.title}
                        </h3>
                        {click.articles?.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {click.articles.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{click.articles?.source}</span>
                          <span>{formatDate(click.clicked_at)}</span>
                        </div>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(click.id)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
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
