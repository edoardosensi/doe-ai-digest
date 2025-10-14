import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

interface BubbleDialogProps {
  userId: string;
}

export const BubbleDialog = ({ userId }: BubbleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadBubble();
    }
  }, [open, userId]);

  const loadBubble = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('custom_profile')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      setBubble(data?.custom_profile || "");
    } catch (error: any) {
      console.error('Error loading bubble:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare la tua bolla",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ custom_profile: bubble })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Salvato!",
        description: "La tua bolla è stata aggiornata",
      });
      setOpen(false);
    } catch (error: any) {
      console.error('Error saving bubble:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la bolla",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Sparkles className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            La tua Bolla
          </DialogTitle>
          <DialogDescription>
            Questo è il profilo AI che guida la selezione personalizzata dei tuoi articoli. 
            Puoi modificarlo per influenzare le raccomandazioni future.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Profilo AI</label>
            <Textarea
              value={bubble}
              onChange={(e) => setBubble(e.target.value)}
              placeholder="L'AI analizzerà i tuoi interessi e creerà un profilo personalizzato..."
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Questo profilo viene generato e aggiornato automaticamente dall'AI in base ai tuoi click sugli articoli.
              Puoi modificarlo manualmente per guidare meglio le raccomandazioni.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
