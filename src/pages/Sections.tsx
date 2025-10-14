import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronDown, ChevronRight, Newspaper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

interface RssFeed {
  id: string;
  name: string;
  url: string;
  section_name: string;
}

const Sections = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userSections, setUserSections] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<string | null>(null);
  const [feedsBySection, setFeedsBySection] = useState<Record<string, RssFeed[]>>({});
  const [feedPreferences, setFeedPreferences] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadUserSections(session.user.id);
        loadFeeds(session.user.id);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadUserSections(session.user.id);
        loadFeeds(session.user.id);
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

  const loadFeeds = async (userId: string) => {
    try {
      // Load all RSS feeds grouped by section
      const { data: feedsData, error: feedsError } = await supabase
        .from('rss_feeds')
        .select('*')
        .eq('is_default', true);

      if (feedsError) throw feedsError;

      // Group feeds by section
      const grouped: Record<string, RssFeed[]> = {};
      feedsData?.forEach((feed) => {
        if (feed.section_name) {
          if (!grouped[feed.section_name]) {
            grouped[feed.section_name] = [];
          }
          grouped[feed.section_name].push(feed);
        }
      });
      setFeedsBySection(grouped);

      // Load user feed preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_feed_preferences')
        .select('feed_id, enabled')
        .eq('user_id', userId);

      if (prefsError) throw prefsError;

      const prefs: Record<string, boolean> = {};
      prefsData?.forEach((pref) => {
        prefs[pref.feed_id] = pref.enabled;
      });
      setFeedPreferences(prefs);
    } catch (error: any) {
      console.error('Error loading feeds:', error);
    }
  };

  const toggleFeedPreference = async (feedId: string, currentEnabled: boolean) => {
    if (!user) return;

    try {
      const newEnabled = !currentEnabled;
      
      // Check if preference exists
      const { data: existing } = await supabase
        .from('user_feed_preferences')
        .select('id')
        .eq('user_id', user.id)
        .eq('feed_id', feedId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_feed_preferences')
          .update({ enabled: newEnabled })
          .eq('user_id', user.id)
          .eq('feed_id', feedId);
      } else {
        await supabase
          .from('user_feed_preferences')
          .insert({ user_id: user.id, feed_id: feedId, enabled: newEnabled });
      }

      setFeedPreferences({ ...feedPreferences, [feedId]: newEnabled });
      
      toast({
        title: newEnabled ? "Giornale attivato" : "Giornale disattivato",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile modificare il giornale",
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
            <div className="space-y-2">
              {AVAILABLE_SECTIONS.map((section) => {
                const sectionFeeds = feedsBySection[section] || [];
                const isExpanded = expandedSections[section];
                
                return (
                  <Collapsible
                    key={section}
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedSections({ ...expandedSections, [section]: open })}
                  >
                    <div className="rounded-lg border bg-background">
                      <div className="flex items-center space-x-3 p-4">
                        <Checkbox
                          id={section}
                          checked={userSections[section] || false}
                          onCheckedChange={() => handleToggleSection(section)}
                        />
                        <label
                          htmlFor={section}
                          className="flex-1 text-sm font-medium leading-none cursor-pointer"
                        >
                          {section}
                        </label>
                        {sectionFeeds.length > 0 && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Newspaper className="h-4 w-4" />
                              {sectionFeeds.length} {sectionFeeds.length === 1 ? 'giornale' : 'giornali'}
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>
                      
                      <CollapsibleContent>
                        <div className="border-t px-4 pb-4 pt-2 space-y-2">
                          <p className="text-xs text-muted-foreground mb-3">
                            Seleziona quali giornali possono apparire in questa sezione:
                          </p>
                          {sectionFeeds.map((feed) => {
                            const isEnabled = feedPreferences[feed.id] !== false;
                            return (
                              <div key={feed.id} className="flex items-center space-x-3 pl-4 py-2 rounded hover:bg-accent/50">
                                <Checkbox
                                  id={`feed-${feed.id}`}
                                  checked={isEnabled}
                                  onCheckedChange={() => toggleFeedPreference(feed.id, isEnabled)}
                                />
                                <label
                                  htmlFor={`feed-${feed.id}`}
                                  className="flex-1 text-sm cursor-pointer"
                                >
                                  <div className="font-medium">{feed.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{feed.url}</div>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
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
