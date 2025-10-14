import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { BookOpen, LogOut, User, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { UserProfileDialog } from "./UserProfileDialog";
import { ClickedArticlesDialog } from "./ClickedArticlesDialog";
import { SavedArticlesDialog } from "./SavedArticlesDialog";

interface NavbarProps {
  user?: any;
  userProfile?: string | null;
}

export const Navbar = ({ user, userProfile }: NavbarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Disconnesso",
      description: "Ci vediamo presto!",
    });
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            doe.onl
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <Link to="/sections">Sezioni</Link>
              </Button>
              <UserProfileDialog userProfile={userProfile} userId={user.id} />
              <ClickedArticlesDialog userId={user.id} />
              <SavedArticlesDialog userId={user.id} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Esci
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild>
              <Link to="/auth">Accedi</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};