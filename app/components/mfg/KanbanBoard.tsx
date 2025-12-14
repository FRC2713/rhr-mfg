import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Columns3, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard as KanbanCardComponent } from "./KanbanCard";
import type {
  KanbanConfig,
  KanbanColumn as KanbanColumnType,
} from "~/app/api/kanban/config/route";
import type { KanbanCard } from "~/app/api/kanban/cards/types";

interface KanbanBoardProps {
  config: KanbanConfig;
  onConfigChange: (config: KanbanConfig) => void;
  isEditMode?: boolean;
  originalConfig?: KanbanConfig | null;
}

export function KanbanBoard({
  config,
  onConfigChange,
  isEditMode = false,
  originalConfig,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumnType[]>(config.columns);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const queryClient = useQueryClient();
  const lastSyncedConfigRef = useRef<string>(JSON.stringify(config.columns));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch cards
  const { data: cardsData, isLoading: isLoadingCards } = useQuery<{
    cards: KanbanCard[];
  }>({
    queryKey: ["kanban-cards"],
    queryFn: async () => {
      const response = await fetch("/api/kanban/cards");
      if (!response.ok) {
        throw new Error("Failed to fetch cards");
      }
      return response.json();
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const cards = cardsData?.cards || [];

  // Sync columns with config when config changes (e.g., on cancel)
  // Only sync if the config actually changed from an external source
  useEffect(() => {
    const configString = JSON.stringify(config.columns);
    if (configString !== lastSyncedConfigRef.current) {
      setColumns(config.columns);
      lastSyncedConfigRef.current = configString;
    }
  }, [config.columns]);

  // Mutation to update card column
  const moveCardMutation = useMutation({
    mutationFn: async ({
      cardId,
      columnId,
    }: {
      cardId: string;
      columnId: string;
    }) => {
      const formData = new FormData();
      formData.append("action", "moveCard");
      formData.append("cardId", cardId);
      formData.append("columnId", columnId);

      const response = await fetch("/mfg/parts", {
        method: "POST",
        body: formData,
      });

      // Server always returns JSON, so parse it directly
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Failed to move card";
        throw new Error(errorMessage);
      }

      return data;
    },
    onMutate: async ({ cardId, columnId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["kanban-cards"] });

      // Snapshot previous value
      const previousCards = queryClient.getQueryData<{ cards: KanbanCard[] }>([
        "kanban-cards",
      ]);

      // Optimistically update
      if (previousCards) {
        queryClient.setQueryData<{ cards: KanbanCard[] }>(["kanban-cards"], {
          cards: previousCards.cards.map((card) =>
            card.id === cardId ? { ...card, columnId } : card
          ),
        });
      }

      return { previousCards };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousCards) {
        queryClient.setQueryData(["kanban-cards"], context.previousCards);
      }
      toast.error("Failed to move card", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
    onSuccess: () => {
      toast.success("Card moved");
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["kanban-cards"] });
    },
  });

  // Group cards by columnId
  const cardsByColumn = useMemo(() => {
    const grouped: Record<string, KanbanCard[]> = {};
    cards.forEach((card) => {
      if (!grouped[card.columnId]) {
        grouped[card.columnId] = [];
      }
      grouped[card.columnId].push(card);
    });
    return grouped;
  }, [cards]);

  // Debounced save effect - only active in edit mode
  useEffect(() => {
    if (!isEditMode) {
      // Clear any pending timeout when exiting edit mode
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        setSaveTimeout(null);
      }
      return;
    }

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for auto-save (only updates local state in edit mode)
    const timeout = setTimeout(() => {
      const updatedConfig: KanbanConfig = {
        ...config,
        columns: columns.map((col, index) => ({
          ...col,
          position: index,
        })),
      };
      // Update ref to prevent unnecessary sync when config prop updates
      lastSyncedConfigRef.current = JSON.stringify(updatedConfig.columns);
      onConfigChange(updatedConfig);
    }, 300);

    setSaveTimeout(timeout);

    // Cleanup
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [columns, isEditMode, config, onConfigChange]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    // Check if we're dragging a card
    const card = cards.find((c) => c.id === active.id);
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Clear the active card
    setActiveCard(null);

    if (!over) return;

    // Check if we're dragging a card or a column
    const isCard = cards.some((card) => card.id === active.id);
    const isColumn = columns.some((col) => col.id === active.id);

    if (isCard) {
      // Handle card drag
      const cardId = active.id as string;
      let targetColumnId = over.id as string;

      // Check if over.id is a card id (card dragged over another card)
      // If so, find the column that contains that card
      const overCard = cards.find((c) => c.id === over.id);
      if (overCard) {
        targetColumnId = overCard.columnId;
      } else {
        // Check if over.id is a column id
        const overColumn = columns.find((col) => col.id === over.id);
        if (!overColumn) {
          // If it's neither a card nor a column, we can't determine the target
          return;
        }
        // targetColumnId is already set to the column id
      }

      // Check if the card is being moved to a different column
      const card = cards.find((c) => c.id === cardId);
      if (card && card.columnId !== targetColumnId) {
        moveCardMutation.mutate({ cardId, columnId: targetColumnId });
      }
    } else if (isColumn) {
      // Handle column drag (reordering columns) - only in edit mode
      if (isEditMode && active.id !== over.id) {
        setColumns((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);

          return arrayMove(items, oldIndex, newIndex);
        });
      }
    }
  };

  const handleAddColumn = useCallback(() => {
    const newColumn: KanbanColumnType = {
      id: `column-${Date.now()}`,
      title: "New Column",
      position: columns.length,
    };
    setColumns([...columns, newColumn]);
  }, [columns]);

  const handleRenameColumn = useCallback((id: string, newTitle: string) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === id ? { ...col, title: newTitle } : col))
    );
  }, []);

  const handleDeleteColumn = useCallback((id: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== id));
  }, []);

  // Empty state
  if (columns.length === 0) {
    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="bg-muted/30 flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Columns3 className="size-4" />
              <span>0 columns</span>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {cards.length} cards
            </Badge>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-muted/10 flex flex-1 items-center justify-center p-8">
          <div className="bg-card flex max-w-md flex-col items-center rounded-2xl border-2 border-dashed p-12 text-center shadow-sm">
            <div className="bg-muted mb-4 rounded-full p-4">
              <Columns3 className="text-muted-foreground size-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No columns yet</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              {isEditMode
                ? "Create your first column to start organizing your workflow. You can add, rename, and reorder columns as needed."
                : "Enter edit mode to create your first column and start organizing your workflow."}
            </p>
            {isEditMode && (
              <Button onClick={handleAddColumn} size="lg">
                <Plus className="mr-2 size-5" />
                Create First Column
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Board Header */}
      <div className="bg-muted/30 flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Columns3 className="size-4" />
            <span>
              {columns.length} {columns.length === 1 ? "column" : "columns"}
            </span>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {cards.length} {cards.length === 1 ? "card" : "cards"}
          </Badge>
          {isLoadingCards && (
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          )}
        </div>
        {isEditMode && (
          <Button onClick={handleAddColumn} size="sm" variant="outline">
            <Plus className="mr-2 size-4" />
            Add Column
          </Button>
        )}
      </div>

      {/* Board Content */}
      <div className="relative flex-1 overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={columns.map((col) => col.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex h-full gap-4 overflow-x-auto p-6">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={cardsByColumn[column.id] || []}
                  onRename={handleRenameColumn}
                  onDelete={handleDeleteColumn}
                  isEditMode={isEditMode}
                />
              ))}

              {/* Quick add column button at the end - only in edit mode */}
              {isEditMode && (
                <button
                  onClick={handleAddColumn}
                  className="border-muted-foreground/20 bg-muted/20 text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/40 hover:text-foreground flex h-full w-[320px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all"
                >
                  <Plus className="size-6" />
                  <span className="text-sm font-medium">Add Column</span>
                </button>
              )}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeCard ? (
              <div className="rotate-3 opacity-95" style={{ width: "300px" }}>
                <KanbanCardComponent card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the kanban board
 */
export function KanbanBoardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="bg-muted/30 flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Content */}
      <div className="flex flex-1 gap-4 overflow-hidden p-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card flex h-full w-[320px] shrink-0 flex-col rounded-xl border"
          >
            <div className="bg-muted/30 flex items-center gap-2 border-b px-3 py-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <div className="flex-1 space-y-3 p-3">
              {[1, 2, 3].slice(0, Math.ceil(Math.random() * 3)).map((j) => (
                <Skeleton
                  key={j}
                  className="h-24 w-full rounded-lg"
                  style={{
                    animationDelay: `${(i + j) * 100}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
