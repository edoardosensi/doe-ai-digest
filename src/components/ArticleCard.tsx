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
      className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-border bg-card h-full flex flex-col"
      onClick={handleCardClick}
    >
      {image_url && (
        <div className="w-full h-40 sm:h-48 overflow-hidden relative flex-shrink-0">
          <img 
            src={image_url} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}
      <CardHeader className="pb-3 space-y-2 flex-shrink-0">
        {source && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-accent uppercase tracking-widest">
              {source}
            </span>
          </div>
        )}
        <CardTitle className="text-lg sm:text-xl font-heading font-bold leading-tight line-clamp-3 group-hover:text-accent transition-colors duration-200">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
          {description}
        </p>
        <div className="flex gap-2 pt-2 flex-shrink-0">
          <Button 
            variant="default" 
            size="sm"
            className="font-semibold text-xs sm:text-sm flex-1 sm:flex-none"
            onClick={handleCardClick}
          >
            Leggi
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