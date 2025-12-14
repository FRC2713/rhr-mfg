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
import type { KanbanColumn as KanbanColumnType } from "~/api/kanban/config/route";
import type { KanbanCard as KanbanCardType } from "~/api/kanban/cards/types";

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  isEditMode?: boolean;
}

export function KanbanColumn({
  column,
  cards,
  onRename,
  onDelete,
  isEditMode = false,
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
        <div className="bg-muted/30 flex items-center gap-2 border-b px-2 py-2 sm:px-3 sm:py-3">
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
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums sm:px-2 sm:text-xs">
              {cards.length}
            </span>
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
        <div className="flex-1 overflow-y-auto p-2 sm:p-3">
          <SortableContext
            items={cards.map((card) => card.id)}
            strategy={verticalListSortingStrategy}
          >
            {cards.length === 0 ? (
              <div
                className={`flex h-24 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors sm:h-32 ${
                  isOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/20"
                }`}
              >
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {isOver ? "Drop here" : "No cards"}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
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
