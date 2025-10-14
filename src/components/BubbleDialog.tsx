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
          <DialogDescription className="space-y-2">
            <p>
              Questo è il profilo AI che guida la selezione personalizzata dei tuoi articoli.
            </p>
            <p className="font-semibold text-foreground">
              💡 Come funziona:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>L'AI analizza i tuoi click e crea automaticamente un profilo dettagliato</li>
              <li>Puoi modificarlo manualmente per specificare esattamente cosa vuoi vedere</li>
              <li>Una volta modificato, l'AI obbedirà alle tue istruzioni</li>
            </ul>
            <p className="font-semibold text-foreground mt-2">
              📝 Esempi di personalizzazione:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>"Voglio solo articoli su un tema specifico"</li>
              <li>"Escludi completamente determinate categorie"</li>
              <li>"Preferisco solo analisi approfondite"</li>
              <li>"Preferisco specifiche fonti giornalistiche"</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Profilo AI</label>
            <Textarea
              value={bubble}
              onChange={(e) => setBubble(e.target.value)}
              placeholder="L'AI creerà automaticamente il tuo profilo analizzando gli articoli che leggi. Puoi modificarlo qui per specificare esattamente cosa vuoi vedere. Ad esempio: 'Voglio solo articoli su tecnologia e intelligenza artificiale, con focus su etica e implicazioni sociali. Niente sport o gossip.'"
              className="min-h-[250px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              💡 <strong>Suggerimento:</strong> Sii specifico! Se modifichi questo testo, l'AI seguirà rigorosamente le tue istruzioni nella selezione degli articoli. 
              Se vuoi tornare alla modalità automatica, cancella tutto e salva.
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
