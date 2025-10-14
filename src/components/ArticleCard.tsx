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
    <Card className="group hover:shadow-xl transition-all duration-300 border-2 border-foreground/20 hover:border-foreground/40 overflow-hidden bg-card">
      {image_url && (
        <div 
          className="w-full h-40 bg-cover bg-center cursor-pointer border-b-2 border-foreground/20" 
          style={{ backgroundImage: `url(${image_url})` }}
          onClick={handleCardClick}
        />
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 cursor-pointer" onClick={handleCardClick}>
            <CardTitle className="text-base font-serif font-bold leading-tight line-clamp-3 group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
            {source && (
              <p className="text-xs font-serif italic text-muted-foreground mt-1 uppercase">{source}</p>
            )}
          </div>
        </div>
        <CardDescription className="line-clamp-2 mt-2 text-sm font-serif cursor-pointer" onClick={handleCardClick}>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCardClick}
          className="flex-1 font-serif border-foreground/30"
        >
          <ExternalLink className="mr-2 h-3 w-3" />
          Leggi
        </Button>
        {showSaveButton && onSave && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
          >
            <Bookmark className="h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};