import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ExternalLink, Bookmark } from "lucide-react";

interface ArticleCardProps {
  title: string;
  description: string;
  url: string;
  source?: string;
  image_url?: string;
  onSave?: () => void;
  onClick?: () => void;
  showSaveButton?: boolean;
}

export const ArticleCard = ({ 
  title, 
  description, 
  url, 
  source,
  image_url,
  onSave,
  onClick,
  showSaveButton = true 
}: ArticleCardProps) => {
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Card 
      className="group overflow-hidden cursor-pointer hover:shadow-strong transition-all duration-300 border border-border bg-card"
      onClick={handleCardClick}
    >
      {image_url && (
        <div className="w-full h-56 overflow-hidden relative">
          <img 
            src={image_url} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}
      <CardHeader className="pb-3 space-y-2">
        {source && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-accent uppercase tracking-widest">
              {source}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">Oggi</span>
          </div>
        )}
        <CardTitle className="text-2xl font-bold leading-tight line-clamp-3 group-hover:text-accent transition-colors duration-200">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {description}
        </p>
        <div className="flex gap-2 pt-2">
          <Button 
            variant="default" 
            size="sm"
            className="font-semibold"
            onClick={handleCardClick}
          >
            Leggi l'articolo
          </Button>
          {showSaveButton && onSave && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
            >
              <Bookmark className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};