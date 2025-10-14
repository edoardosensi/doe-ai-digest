import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { MessageCircle, Sparkles } from "lucide-react";

interface UserProfileDialogProps {
  userProfile: string | null;
}

export const UserProfileDialog = ({ userProfile }: UserProfileDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageCircle className="h-5 w-5" />
          <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Il Tuo Profilo AI
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            L'AI ha analizzato le tue letture per capire cosa ti interessa di più:
          </p>
          {userProfile ? (
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm leading-relaxed">{userProfile}</p>
            </div>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Non abbiamo ancora abbastanza dati per creare il tuo profilo. Continua a leggere articoli per permetterci di conoscerti meglio!
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Più articoli leggi, più l'AI impara a selezionare contenuti su misura per te.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
