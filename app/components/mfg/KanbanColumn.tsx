import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { KanbanColumnHeader } from "./KanbanColumnHeader";
import { KanbanCard } from "./KanbanCard";
import type { KanbanColumn as KanbanColumnType } from "~/routes/api.kanban.config";
import type { KanbanCard as KanbanCardType } from "~/routes/api.kanban.cards/types";

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}

export function KanbanColumn({
  column,
  cards,
  onRename,
  onDelete,
}: KanbanColumnProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setColumnRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRename = (newTitle: string) => {
    if (newTitle.trim()) {
      onRename(column.id, newTitle.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(column.id);
    setIsDeleteDialogOpen(false);
  };

  // Combine refs for both sortable (column) and droppable (cards)
  const combinedRef = (node: HTMLElement | null) => {
    setColumnRef(node);
    setDroppableRef(node);
  };

  return (
    <>
      <div
        ref={combinedRef}
        style={style}
        className={`group/column flex h-full w-[320px] flex-shrink-0 flex-col rounded-xl border bg-card transition-all duration-200 ${
          isDragging
            ? "rotate-1 scale-[1.02] shadow-2xl ring-2 ring-primary/20"
            : ""
        } ${isOver ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
      >
        {/* Column Header */}
        <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-3">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-1 opacity-0 transition-all hover:bg-muted group-hover/column:opacity-100 active:cursor-grabbing"
            aria-label="Drag to reorder column"
          >
            <GripVertical className="size-4 text-muted-foreground" />
          </button>

          {/* Column Title */}
          <div className="flex flex-1 items-center gap-2">
            <KanbanColumnHeader
              title={column.title}
              onRename={handleRename}
              isEditing={isEditing}
              onEditStart={() => setIsEditing(true)}
              onEditEnd={() => setIsEditing(false)}
            />
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {cards.length}
            </span>
          </div>

          {/* Column Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 opacity-0 transition-opacity group-hover/column:opacity-100"
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Column options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 size-4" />
                Rename column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Cards Container */}
        <div className="flex-1 overflow-y-auto p-3">
          <SortableContext
            items={cards.map((card) => card.id)}
            strategy={verticalListSortingStrategy}
          >
            {cards.length === 0 ? (
              <div
                className={`flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                  isOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/20"
                }`}
              >
                <p className="text-sm text-muted-foreground">
                  {isOver ? "Drop here" : "No cards"}
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {cards.map((card) => (
                  <KanbanCard key={card.id} card={card} />
                ))}
              </div>
            )}
          </SortableContext>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete column</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{column.title}"? Cards in this
              column will need to be moved first or they will become orphaned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
