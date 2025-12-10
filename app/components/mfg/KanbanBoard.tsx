import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard as KanbanCardComponent } from "./KanbanCard";
import type {
  KanbanConfig,
  KanbanColumn as KanbanColumnType,
} from "~/routes/api.kanban.config";
import type { KanbanCard } from "~/routes/api.kanban.cards/types";

interface KanbanBoardProps {
  config: KanbanConfig;
  onConfigChange: (config: KanbanConfig) => void;
}

export function KanbanBoard({ config, onConfigChange }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumnType[]>(config.columns);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const queryClient = useQueryClient();

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
  const { data: cardsData } = useQuery<{ cards: KanbanCard[] }>({
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

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      const isJson = contentType?.includes("application/json");

      if (!response.ok) {
        let errorMessage = "Failed to move card";
        if (isJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If JSON parsing fails, use default message
          }
        } else {
          // If it's HTML (error page), try to extract error from text
          const text = await response.text();
          console.error(
            "[Kanban] Non-JSON error response:",
            text.substring(0, 200)
          );
        }
        throw new Error(errorMessage);
      }

      if (!isJson) {
        throw new Error("Server returned non-JSON response");
      }

      return response.json();
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

  // Debounced save effect
  useEffect(() => {
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for auto-save
    const timeout = setTimeout(() => {
      const updatedConfig: KanbanConfig = {
        ...config,
        columns: columns.map((col, index) => ({
          ...col,
          position: index,
        })),
      };
      onConfigChange(updatedConfig);
    }, 300);

    setSaveTimeout(timeout);

    // Cleanup
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [columns]);

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
      const targetColumnId = over.id as string;

      // Check if the card is being moved to a different column
      const card = cards.find((c) => c.id === cardId);
      if (card && card.columnId !== targetColumnId) {
        moveCardMutation.mutate({ cardId, columnId: targetColumnId });
      }
    } else if (isColumn) {
      // Handle column drag (reordering columns)
      if (active.id !== over.id) {
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="text-muted-foreground text-sm">
          {columns.length} {columns.length === 1 ? "column" : "columns"}
        </div>
        <Button onClick={handleAddColumn} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Column
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
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
            <div className="flex h-full gap-4 overflow-x-auto px-4 py-4">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={cardsByColumn[column.id] || []}
                  onRename={handleRenameColumn}
                  onDelete={handleDeleteColumn}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeCard ? (
              <div className="rotate-3 opacity-90" style={{ width: "300px" }}>
                <KanbanCardComponent card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {columns.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No columns yet. Add your first column to get started.
            </p>
            <Button onClick={handleAddColumn}>
              <Plus className="mr-2 h-4 w-4" />
              Add Column
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
