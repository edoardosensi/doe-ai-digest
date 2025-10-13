import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Brain, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/10">
      <Navbar user={user} />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Powered by AI
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Scopri articoli{" "}
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              personalizzati
            </span>
            {" "}per te
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            L'intelligenza artificiale seleziona i contenuti più interessanti dal web, 
            in base ai tuoi interessi. Semplice, veloce, contemporaneo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="gap-2 text-lg px-8 shadow-lg hover:shadow-xl transition-all"
            >
              <Zap className="h-5 w-5" />
              {user ? "Vai alla Dashboard" : "Inizia Ora"}
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4 p-6 rounded-xl bg-card hover:shadow-lg transition-all">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">AI Intelligente</h3>
            <p className="text-muted-foreground">
              Algoritmi avanzati analizzano i tuoi interessi per suggerimenti mirati
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-xl bg-card hover:shadow-lg transition-all">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Contenuti Curati</h3>
            <p className="text-muted-foreground">
              Articoli selezionati dalle migliori fonti del web
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-xl bg-card hover:shadow-lg transition-all">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Sempre Aggiornato</h3>
            <p className="text-muted-foreground">
              Nuovi suggerimenti ogni volta che accedi
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
