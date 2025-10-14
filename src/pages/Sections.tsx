import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AVAILABLE_SECTIONS = [
  "Politica",
  "Politica estera",
  "Sport",
  "Cultura",
  "Roma",
  "Filosofia",
  "Scienza",
  "Televisione",
  "Stampa internazionale"
];

const Sections = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userSections, setUserSections] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadUserSections(session.user.id);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadUserSections(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserSections = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_sections')
        .select('section_name, enabled')
        .eq('user_id', userId);

      if (error) throw error;

      // Se l'utente non ha sezioni configurate, abilita le sezioni di default
      if (!data || data.length === 0) {
        const defaultSections: Record<string, boolean> = {};
        ["Politica", "Politica estera", "Sport", "Cultura"].forEach(section => {
          defaultSections[section] = true;
        });
        setUserSections(defaultSections);
      } else {
        const sections: Record<string, boolean> = {};
        data.forEach((item) => {
          sections[item.section_name] = item.enabled;
        });
        setUserSections(sections);
      }

      // Load custom profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('custom_profile')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (profileData?.custom_profile) {
        setUserProfile(profileData.custom_profile);
      }
    } catch (error: any) {
      console.error('Error loading sections:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le sezioni",
        variant: "destructive",
      });
    }
  };

  const handleToggleSection = (section: string) => {
    setUserSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Delete all existing sections
      await supabase
        .from('user_sections')
        .delete()
        .eq('user_id', user.id);

      // Insert enabled sections
      const sectionsToInsert = Object.entries(userSections)
        .filter(([_, enabled]) => enabled)
        .map(([section_name]) => ({
          user_id: user.id,
          section_name,
          enabled: true
        }));

      if (sectionsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_sections')
          .insert(sectionsToInsert);

        if (error) throw error;
      }

      toast({
        title: "Salvato!",
        description: "Le tue sezioni sono state aggiornate",
      });
    } catch (error: any) {
      console.error('Error saving sections:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le sezioni",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} userProfile={userProfile} />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Le tue Sezioni</h1>
          <p className="text-muted-foreground mb-8">
            Personalizza le sezioni che vuoi vedere nella tua dashboard
          </p>

          <div className="bg-card rounded-lg border p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AVAILABLE_SECTIONS.map((section) => (
                <div
                  key={section}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <Checkbox
                    id={section}
                    checked={userSections[section] || false}
                    onCheckedChange={() => handleToggleSection(section)}
                  />
                  <label
                    htmlFor={section}
                    className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {section}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-6"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Salva Sezioni"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Sections;
