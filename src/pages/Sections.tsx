import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronDown, ChevronRight, Newspaper, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedSection, setNewFeedSection] = useState("");
  const [addingFeed, setAddingFeed] = useState(false);

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
      // Load default RSS feeds
      const { data: feedsData, error: feedsError } = await supabase
        .from('rss_feeds')
        .select('*')
        .eq('is_default', true);

      if (feedsError) throw feedsError;

      // Load user's custom RSS feeds
      const { data: userFeedsData, error: userFeedsError } = await supabase
        .from('user_rss_feeds')
        .select('*')
        .eq('user_id', userId);

      if (userFeedsError) throw userFeedsError;

      // Combine both default and user feeds
      const allFeeds = [...(feedsData || [])];
      
      // Add user feeds (converting to same format)
      userFeedsData?.forEach((userFeed) => {
        allFeeds.push({
          id: userFeed.id,
          name: userFeed.name,
          url: userFeed.url,
          section_name: userFeed.section_name || '',
          is_default: false,
          enabled: userFeed.enabled,
          created_at: userFeed.created_at,
          updated_at: null
        });
      });

      // Group feeds by section
      const grouped: Record<string, RssFeed[]> = {};
      const defaultExpanded: Record<string, boolean> = {};
      allFeeds.forEach((feed) => {
        if (feed.section_name) {
          if (!grouped[feed.section_name]) {
            grouped[feed.section_name] = [];
            // Espandi le sezioni di default
            if (["Politica", "Politica estera", "Sport", "Cultura"].includes(feed.section_name)) {
              defaultExpanded[feed.section_name] = true;
            }
          }
          grouped[feed.section_name].push(feed);
        }
      });
      setFeedsBySection(grouped);
      setExpandedSections(defaultExpanded);

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

  const handleAddFeed = async () => {
    if (!user || !newFeedName || !newFeedUrl || !newFeedSection) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi",
        variant: "destructive",
      });
      return;
    }

    setAddingFeed(true);
    try {
      const { data, error } = await supabase
        .from('user_rss_feeds')
        .insert({
          user_id: user.id,
          name: newFeedName,
          url: newFeedUrl,
          section_name: newFeedSection,
          enabled: true
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh feeds
      await loadFeeds(user.id);
      
      setShowAddFeed(false);
      setNewFeedName("");
      setNewFeedUrl("");
      setNewFeedSection("");

      toast({
        title: "Feed aggiunto!",
        description: "Il tuo feed RSS è stato aggiunto con successo",
      });
    } catch (error: any) {
      console.error('Error adding feed:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiungere il feed",
        variant: "destructive",
      });
    } finally {
      setAddingFeed(false);
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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold">Le tue Sezioni</h1>
            <Dialog open={showAddFeed} onOpenChange={setShowAddFeed}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Aggiungi Feed
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aggiungi Feed RSS</DialogTitle>
                  <DialogDescription>
                    Aggiungi un nuovo feed RSS personalizzato
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="feed-name">Nome del giornale</Label>
                    <Input
                      id="feed-name"
                      placeholder="Es. Il Mio Giornale"
                      value={newFeedName}
                      onChange={(e) => setNewFeedName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feed-url">URL del feed RSS</Label>
                    <Input
                      id="feed-url"
                      type="url"
                      placeholder="https://esempio.com/feed.rss"
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feed-section">Sezione</Label>
                    <Select value={newFeedSection} onValueChange={setNewFeedSection}>
                      <SelectTrigger id="feed-section">
                        <SelectValue placeholder="Seleziona una sezione" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_SECTIONS.map((section) => (
                          <SelectItem key={section} value={section}>
                            {section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowAddFeed(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleAddFeed} disabled={addingFeed}>
                      {addingFeed ? "Aggiunta..." : "Aggiungi"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
