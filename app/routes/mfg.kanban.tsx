import type { Route } from "./+types/mfg.kanban";
import { redirect } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KanbanSquare, Settings2 } from "lucide-react";
import {
  getSession,
  isOnshapeAuthenticated,
  commitSession,
} from "~/lib/session";
import { KanbanBoard, KanbanBoardSkeleton } from "~/components/mfg/KanbanBoard";
import type { KanbanConfig } from "./api.kanban.config";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Kanban Board - Manufacturing" },
    { name: "description", content: "Configure your Kanban board columns" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);

  // Check Onshape authentication
  const onshapeAuthenticated = await isOnshapeAuthenticated(request);

  if (!onshapeAuthenticated) {
    const url = new URL(request.url);
    const fullPath = url.pathname + url.search;
    return redirect(`/signin?redirect=${encodeURIComponent(fullPath)}`);
  }

  const cookie = await commitSession(session);

  return {
    headers: {
      "Set-Cookie": cookie,
    },
  };
}

export default function MfgKanban() {
  const queryClient = useQueryClient();

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
    // Optimistically update the UI
    queryClient.setQueryData(["kanban-config"], newConfig);
    // Save to server
    saveConfigMutation.mutate(newConfig);
  };

  return (
    <main className="bg-background flex h-full flex-1 flex-col overflow-hidden">
      {/* Page Header */}
      <header className="from-card via-card to-muted/50 relative border-b bg-linear-to-r">
        <div className="relative px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="bg-primary/10 ring-primary/20 flex size-12 items-center justify-center rounded-xl ring-1">
                <KanbanSquare className="text-primary size-6" />
              </div>

              {/* Title & Description */}
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Kanban Board
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Organize your manufacturing workflow with drag-and-drop
                  columns and cards
                </p>
              </div>
            </div>

            {/* Status indicator */}
            {saveConfigMutation.isPending && (
              <div className="bg-muted/80 text-muted-foreground flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
                <Settings2 className="size-3 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
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
          <KanbanBoard config={config} onConfigChange={handleConfigChange} />
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
