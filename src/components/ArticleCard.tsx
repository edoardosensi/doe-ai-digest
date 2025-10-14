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
    <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 overflow-hidden">
      {image_url && (
        <div 
          className="w-full h-48 bg-cover bg-center cursor-pointer" 
          style={{ backgroundImage: `url(${image_url})` }}
          onClick={handleCardClick}
        />
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 cursor-pointer" onClick={handleCardClick}>
            <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
            {source && (
              <p className="text-sm text-muted-foreground mt-1">{source}</p>
            )}
          </div>
        </div>
        <CardDescription className="line-clamp-3 mt-2 cursor-pointer" onClick={handleCardClick}>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCardClick}
          className="flex-1"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Leggi
        </Button>
        {showSaveButton && onSave && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};