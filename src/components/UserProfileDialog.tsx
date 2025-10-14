import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Circle, Plus, X, Newspaper, ToggleLeft, ToggleRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";

interface UserProfileDialogProps {
  userProfile: string | null;
  userId: string;
}

interface RssFeed {
  id: string;
  url: string;
  name: string;
  is_default?: boolean;
  enabled: boolean;
}

interface FeedPreference {
  feed_id: string;
  enabled: boolean;
}

export const UserProfileDialog = ({ userProfile, userId }: UserProfileDialogProps) => {
  const { toast } = useToast();
  const [customProfile, setCustomProfile] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [defaultFeeds, setDefaultFeeds] = useState<RssFeed[]>([]);
  const [userFeeds, setUserFeeds] = useState<RssFeed[]>([]);
  const [feedPreferences, setFeedPreferences] = useState<Record<string, boolean>>({});
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedName, setNewFeedName] = useState("");
  const [isAddingFeed, setIsAddingFeed] = useState(false);

  useEffect(() => {
    loadCustomProfile();
    loadFeeds();
  }, [userId]);

  // Sync customProfile with userProfile when it updates
  useEffect(() => {
    if (userProfile && !customProfile) {
      setCustomProfile(userProfile);
    }
  }, [userProfile]);

  const loadCustomProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('custom_profile')
      .eq('user_id', userId)
      .single();
    
    if (data?.custom_profile) {
      setCustomProfile(data.custom_profile);
    }
  };

  const loadFeeds = async () => {
    // Load default feeds
    const { data: defaultData } = await supabase
      .from('rss_feeds')
      .select('*')
      .eq('is_default', true);
    
    if (defaultData) setDefaultFeeds(defaultData);

    // Load user preferences for default feeds
    const { data: prefsData } = await supabase
      .from('user_feed_preferences')
      .select('feed_id, enabled')
      .eq('user_id', userId);
    
    if (prefsData) {
      const prefs: Record<string, boolean> = {};
      prefsData.forEach((p: FeedPreference) => {
        prefs[p.feed_id] = p.enabled;
      });
      setFeedPreferences(prefs);
    }

    // Load user custom feeds
    const { data: userData } = await supabase
      .from('user_rss_feeds')
      .select('*')
      .eq('user_id', userId);
    
    if (userData) setUserFeeds(userData);
  };

  const saveCustomProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ custom_profile: customProfile })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Bolla aggiornata!",
        description: "La tua bolla personalizzata è stata aggiornata con successo",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la bolla",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomFeed = async () => {
    if (!newFeedUrl || !newFeedName) {
      toast({
        title: "Errore",
        description: "Inserisci sia l'URL che il nome del feed",
        variant: "destructive",
      });
      return;
    }

    setIsAddingFeed(true);
    try {
      const { error } = await supabase
        .from('user_rss_feeds')
        .insert({
          user_id: userId,
          url: newFeedUrl,
          name: newFeedName,
          enabled: true
        });

      if (error) throw error;

      toast({
        title: "Feed aggiunto!",
        description: "Il nuovo feed RSS è stato aggiunto",
      });
      
      setNewFeedUrl("");
      setNewFeedName("");
      loadFeeds();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiungere il feed",
        variant: "destructive",
      });
    } finally {
      setIsAddingFeed(false);
    }
  };

  const toggleDefaultFeed = async (feedId: string, currentEnabled: boolean) => {
    try {
      const newEnabled = !currentEnabled;
      
      // Check if preference already exists
      const { data: existing } = await supabase
        .from('user_feed_preferences')
        .select('id')
        .eq('user_id', userId)
        .eq('feed_id', feedId)
        .single();

      if (existing) {
        // Update existing preference
        const { error } = await supabase
          .from('user_feed_preferences')
          .update({ enabled: newEnabled })
          .eq('user_id', userId)
          .eq('feed_id', feedId);
        
        if (error) throw error;
      } else {
        // Create new preference
        const { error } = await supabase
          .from('user_feed_preferences')
          .insert({ user_id: userId, feed_id: feedId, enabled: newEnabled });
        
        if (error) throw error;
      }

      setFeedPreferences({ ...feedPreferences, [feedId]: newEnabled });
      
      toast({
        title: newEnabled ? "Feed attivato" : "Feed disattivato",
        description: newEnabled ? "Il feed è stato attivato" : "Il feed è stato disattivato",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile modificare il feed",
        variant: "destructive",
      });
    }
  };

  const deleteFeed = async (feedId: string) => {
    try {
      const { error } = await supabase
        .from('user_rss_feeds')
        .delete()
        .eq('id', feedId);

      if (error) throw error;

      toast({
        title: "Feed rimosso",
        description: "Il feed è stato rimosso dalla tua lista",
      });
      
      loadFeeds();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile rimuovere il feed",
        variant: "destructive",
      });
    }
  };

  const displayProfile = customProfile || userProfile;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <div className="flex items-center gap-0.5">
            <Circle className="h-3 w-3 fill-primary text-primary" />
            <Circle className="h-3 w-3 fill-primary text-primary" />
            <Circle className="h-3 w-3 fill-primary text-primary" />
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <Circle className="h-4 w-4 fill-primary text-primary" />
              <Circle className="h-4 w-4 fill-primary text-primary" />
              <Circle className="h-4 w-4 fill-primary text-primary" />
            </div>
            Il Tuo Profilo AI
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="bubble" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bubble">La mia bolla</TabsTrigger>
            <TabsTrigger value="feeds">Giornali</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bubble" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              L'AI analizza i tuoi click per creare una descrizione sempre più accurata dei tuoi interessi. Puoi modificarla direttamente:
            </p>
            
            <div className="space-y-4">
              <Textarea
                value={customProfile || displayProfile || ""}
                onChange={(e) => setCustomProfile(e.target.value)}
                placeholder="L'AI sta imparando i tuoi interessi... Clicca più articoli per creare la tua bolla personalizzata, oppure scrivila tu stesso qui."
                className="min-h-[150px]"
              />
              <Button 
                onClick={saveCustomProfile} 
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? "Aggiornamento..." : "Aggiorna bolla"}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Più articoli leggi, più l'AI affina la tua bolla. Puoi sempre modificarla manualmente per guidare meglio l'AI nella selezione dei contenuti.
            </p>
          </TabsContent>
          
          <TabsContent value="feeds" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Newspaper className="h-4 w-4" />
                  Giornali di Default
                </h3>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  <div className="space-y-2">
                    {defaultFeeds.map((feed) => {
                      const isEnabled = feedPreferences[feed.id] !== false;
                      return (
                        <div key={feed.id} className="flex items-center justify-between text-sm group">
                          <div className="flex-1 min-w-0">
                            <span className={`font-medium block ${!isEnabled ? 'text-muted-foreground line-through' : ''}`}>
                              {feed.name}
                            </span>
                            <span className="text-xs text-muted-foreground truncate block">
                              {feed.url}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleDefaultFeed(feed.id, isEnabled)}
                          >
                            {isEnabled ? (
                              <ToggleRight className="h-5 w-5 text-primary" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">I Tuoi Giornali Personalizzati</h3>
                <ScrollArea className="h-[150px] w-full rounded-md border p-4">
                  {userFeeds.length > 0 ? (
                    <div className="space-y-2">
                      {userFeeds.map((feed) => (
                        <div key={feed.id} className="flex items-center justify-between text-sm group">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium block">{feed.name}</span>
                            <span className="text-xs text-muted-foreground truncate block">
                              {feed.url}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteFeed(feed.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nessun feed personalizzato aggiunto
                    </p>
                  )}
                </ScrollArea>
              </div>
              
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <h3 className="text-sm font-medium">Aggiungi nuovo feed RSS</h3>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="feed-name" className="text-xs">Nome Giornale</Label>
                    <Input
                      id="feed-name"
                      placeholder="Es: Il Fatto Quotidiano"
                      value={newFeedName}
                      onChange={(e) => setNewFeedName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="feed-url" className="text-xs">URL Feed RSS</Label>
                    <Input
                      id="feed-url"
                      placeholder="https://..."
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={addCustomFeed} 
                    disabled={isAddingFeed}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {isAddingFeed ? "Aggiunta..." : "Aggiungi Feed"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
