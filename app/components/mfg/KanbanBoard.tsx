import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { KanbanColumn } from "./KanbanColumn";
import type { KanbanConfig, KanbanColumn as KanbanColumnType } from "~/routes/api.kanban.config";

interface KanbanBoardProps {
  config: KanbanConfig;
  onConfigChange: (config: KanbanConfig) => void;
}

export function KanbanBoard({ config, onConfigChange }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumnType[]>(config.columns);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {columns.length} {columns.length === 1 ? "column" : "columns"}
        </div>
        <Button onClick={handleAddColumn} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Column
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columns.map((col) => col.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onRename={handleRenameColumn}
                onDelete={handleDeleteColumn}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {columns.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No columns yet. Add your first column to get started.
          </p>
          <Button onClick={handleAddColumn}>
            <Plus className="mr-2 h-4 w-4" />
            Add Column
          </Button>
        </div>
      )}
    </div>
  );
}

