"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "~/lib/supabase/browser-client";
import { kanbanQueryKeys } from "./queries";

export function useKanbanRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel("kanban-cards-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kanban_cards",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.cards() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
