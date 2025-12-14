"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KanbanSquare, Settings2, Edit, Save, X } from "lucide-react";
import { KanbanBoard, KanbanBoardSkeleton } from "~/components/mfg/KanbanBoard";
import { Button } from "~/components/ui/button";
import type { KanbanConfig } from "~/api/kanban/config/route";

export function MfgKanbanClient() {
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<KanbanConfig | null>(
    null
  );

  // Fetch Kanban config
  const { data: config, isLoading } = useQuery<KanbanConfig>({
    queryKey: ["kanban-config"],
    queryFn: async () => {
      const response = await fetch("/api/kanban/config");
      if (!response.ok) {
        throw new Error("Failed to fetch Kanban config");
      }
      return response.json();
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  });

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: KanbanConfig) => {
      const response = await fetch("/api/kanban/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save configuration");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update the cache with the new config
      queryClient.setQueryData(["kanban-config"], data.config);
      toast.success("Configuration saved");
    },
    onError: (error) => {
      toast.error("Failed to save configuration", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    },
  });

  const handleConfigChange = (newConfig: KanbanConfig) => {
    // Only update local state when in edit mode
    // Actual save happens when user clicks Save button
    if (isEditMode) {
      queryClient.setQueryData(["kanban-config"], newConfig);
    }
  };

  const handleEnterEditMode = () => {
    if (config) {
      // Store original config for cancel functionality
      setOriginalConfig(JSON.parse(JSON.stringify(config)));
      setIsEditMode(true);
    }
  };

  const handleSave = () => {
    if (config) {
      // Save to server
      saveConfigMutation.mutate(config, {
        onSuccess: () => {
          setIsEditMode(false);
          setOriginalConfig(null);
        },
      });
    }
  };

  const handleCancel = () => {
    if (originalConfig) {
      // Revert to original config
      queryClient.setQueryData(["kanban-config"], originalConfig);
      setIsEditMode(false);
      setOriginalConfig(null);
    }
  };

  return (
    <main className="bg-background flex h-full flex-1 flex-col overflow-hidden">
      {/* Page Header */}
      <header className="from-card via-card to-muted/50 relative border-b bg-linear-to-r">
        <div className="relative px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Icon */}
              <div className="bg-primary/10 ring-primary/20 flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 sm:size-12">
                <KanbanSquare className="text-primary size-5 sm:size-6" />
              </div>

              {/* Title & Description */}
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Kanban Board
                </h1>
                <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                  Organize your manufacturing workflow with drag-and-drop
                  columns and cards
                </p>
              </div>
            </div>

            {/* Edit Mode Controls */}
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              {!isEditMode ? (
                <Button
                  onClick={handleEnterEditMode}
                  variant="outline"
                  size="sm"
                  disabled={!config}
                  className="w-full sm:w-auto"
                >
                  <Edit className="mr-2 size-4" />
                  <span className="sm:inline">Edit Columns</span>
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    disabled={saveConfigMutation.isPending}
                    className="flex-1 sm:flex-initial"
                  >
                    <X className="mr-2 size-4" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    size="sm"
                    disabled={saveConfigMutation.isPending}
                    className="flex-1 sm:flex-initial"
                  >
                    <Save className="mr-2 size-4" />
                    Save
                  </Button>
                </>
              )}
              {/* Status indicator */}
              {saveConfigMutation.isPending && (
                <div className="bg-muted/80 text-muted-foreground flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
                  <Settings2 className="size-3 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Decorative gradient line */}
        <div className="via-primary/20 absolute right-0 bottom-0 left-0 h-px bg-linear-to-r from-transparent to-transparent" />
      </header>

      {/* Board Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <KanbanBoardSkeleton />
        ) : config ? (
          <KanbanBoard
            config={config}
            onConfigChange={handleConfigChange}
            isEditMode={isEditMode}
            originalConfig={originalConfig}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">
                Failed to load configuration
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
