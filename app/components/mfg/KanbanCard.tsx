import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { KanbanCard as KanbanCardType } from "~/routes/api.kanban.cards/types";

interface KanbanCardProps {
  card: KanbanCardType;
}

export function KanbanCard({ card }: KanbanCardProps) {
  const [imageError, setImageError] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="mb-3 cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold">{card.title}</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {card.imageUrl && !imageError && (
          <div className="w-full">
            <img
              src={card.imageUrl}
              alt={card.title}
              className="bg-muted h-auto w-full rounded border"
              onError={() => setImageError(true)}
              style={{ maxHeight: "300px", objectFit: "contain" }}
            />
          </div>
        )}

        <div className="space-y-2 text-sm">
          {card.assignee && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assignee:</span>
              <span className="font-medium">{card.assignee}</span>
            </div>
          )}

          {card.material && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Material:</span>
              <Badge variant="secondary">{card.material}</Badge>
            </div>
          )}

          {card.machine && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Machine:</span>
              <Badge variant="outline">{card.machine}</Badge>
            </div>
          )}

          <div className="text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
            <span>Created:</span>
            <span>{formatDate(card.dateCreated)}</span>
          </div>

          {card.dateCreated !== card.dateUpdated && (
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Updated:</span>
              <span>{formatDate(card.dateUpdated)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
