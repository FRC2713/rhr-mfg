import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { KanbanCard as KanbanCardType } from "~/routes/api.kanban.cards/types";

interface KanbanCardProps {
  card: KanbanCardType;
}

export function KanbanCard({ card }: KanbanCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm line-clamp-2">{card.title}</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {card.imageUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
            <img
              src={card.imageUrl}
              alt={card.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Assignee:</span>
            <span className="font-medium">{card.assignee}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Material:</span>
            <Badge variant="secondary">{card.material}</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Machine:</span>
            <Badge variant="outline">{card.machine}</Badge>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Created:</span>
            <span>{formatDate(card.dateCreated)}</span>
          </div>
          
          {card.dateCreated !== card.dateUpdated && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Updated:</span>
              <span>{formatDate(card.dateUpdated)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

