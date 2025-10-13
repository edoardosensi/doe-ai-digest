import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Supabase client automatically handles the session from the URL hash.
    // We listen for the PASSWORD_RECOVERY event to confirm authentication.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setIsAuthenticated(true);
        toast({
          title: "Autenticato",
          description: "Ora puoi inserire la tua nuova password.",
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({
        title: "Errore",
        description: "Autenticazione non completata. Prova a ricaricare la pagina o a usare di nuovo il link.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile reimpostare la password. Il link potrebbe essere scaduto.",
        variant: "destructive",
      });
      setLoading(false);
    } else {
      toast({
        title: "Password aggiornata",
        description: "La tua password è stata aggiornata con successo. Verrai reindirizzato alla pagina di accesso.",
      });
      
      // Sign out the user from the recovery session and redirect
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reimposta la tua password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nuova Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!isAuthenticated}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !isAuthenticated}>
              {loading ? "Reimpostazione in corso..." : "Reimposta Password"}
            </Button>
            {!isAuthenticated && (
              <p className="text-sm text-center text-muted-foreground pt-2">
                In attesa di verifica dal link ricevuto via email...
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
