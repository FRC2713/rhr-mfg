import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
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
import { Badge } from "~/components/ui/badge";
import type { KanbanColumn as KanbanColumnType } from "~/api/kanban/config/route";
import type { KanbanCardRow } from "~/lib/supabase/database.types";
import { KanbanColumnCardContainer } from "./KanbanColumnCardContainer";

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCardRow[];
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  isEditMode?: boolean;
  isDraggingCard?: boolean;
  hideImages?: boolean;
}

export function KanbanColumn({
  column,
  cards,
  onRename,
  onDelete,
  isEditMode = false,
  isDraggingCard = false,
  hideImages = false,
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
        className={`group/column bg-card flex h-full w-[280px] shrink-0 flex-col rounded-xl border transition-all duration-200 sm:w-[320px] ${
          isDragging
            ? "ring-primary/20 scale-[1.02] rotate-1 shadow-2xl ring-2"
            : ""
        } ${isOver ? "ring-primary ring-offset-background ring-2 ring-offset-2" : ""}`}
      >
        {/* Column Header */}
        <div className="bg-muted/30 flex items-center gap-2 rounded-t-xl border-b px-2 py-2 sm:px-3 sm:py-3">
          {/* Drag Handle - Always visible on touch devices, hover-only on desktop */}
          {isEditMode && (
            <button
              {...attributes}
              {...listeners}
              className="active:bg-muted hover:bg-muted cursor-grab touch-none rounded p-1 opacity-60 transition-all group-hover/column:opacity-100 hover:opacity-100 active:cursor-grabbing active:opacity-100"
              aria-label="Drag to reorder column"
            >
              <GripVertical className="text-muted-foreground size-4" />
            </button>
          )}

          {/* Column Title */}
          <div className="flex flex-1 items-center gap-2">
            <KanbanColumnHeader
              title={column.title}
              onRename={handleRename}
              isEditing={isEditing}
              onEditStart={() => setIsEditing(true)}
              onEditEnd={() => setIsEditing(false)}
            />
            <Badge variant="secondary" className="text-xs tabular-nums">
              {cards.length}
            </Badge>
          </div>

          {/* Column Menu - Always visible on touch devices, hover-only on desktop */}
          {isEditMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-60 transition-opacity group-hover/column:opacity-100 hover:opacity-100 active:opacity-100"
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
          )}
        </div>

        {/* Cards Container */}
        <KanbanColumnCardContainer
          columnName={column.title}
          cards={cards}
          isDraggingCard={isDraggingCard}
          hideImages={hideImages}
        />
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
