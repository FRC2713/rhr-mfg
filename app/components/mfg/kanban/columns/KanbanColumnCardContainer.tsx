import { PlusCircle, SquareDashedKanban } from "lucide-react";
import type { KanbanCardRow } from "~/lib/supabase/database.types";
import { KanbanCard } from "../cards/KanbanCard";

interface KanbanColumnCardContainerProps {
  columnName: string;
  cards: KanbanCardRow[];
  isDraggingCard?: boolean;
  hideImages?: boolean;
}

export function KanbanColumnCardContainer({
  columnName,
  cards,
  isDraggingCard = false,
  hideImages = false,
}: KanbanColumnCardContainerProps) {
  if (isDraggingCard) {
    return (
      <div className="border-primary/20 flex h-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors">
        <PlusCircle className="text-primary/50 size-6" />
        <p className="text-primary text-xs sm:text-sm">Move to {columnName}</p>
      </div>
    );
  }
  if (cards.length === 0) {
    return (
      <div className="border-secondary/20 flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors">
        <SquareDashedKanban className="text-muted-foreground/50 size-6" />
        <p className="text-muted-foreground text-xs sm:text-sm">No cards</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
      {cards.map((card) => (
        <KanbanCard key={card.id} card={card} hideImages={hideImages} />
      ))}
    </div>
  );
}
