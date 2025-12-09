import type { Route } from "./+types/mfg.kanban";
import { redirect } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getSession,
  isOnshapeAuthenticated,
  commitSession,
} from "~/lib/session";
import { KanbanBoard } from "~/components/mfg/KanbanBoard";
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

  if (isLoading) {
    return (
      <main className="flex h-full flex-1 flex-col">
        <div className="border-b px-4 py-4">
          <h1 className="text-3xl font-bold">Kanban Board</h1>
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="border-b px-4 py-4">
        <h1 className="text-3xl font-bold">Kanban Board</h1>
        <p className="text-muted-foreground">Configure your workflow columns</p>
      </div>

      {config && (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard config={config} onConfigChange={handleConfigChange} />
        </div>
      )}
    </main>
  );
}
