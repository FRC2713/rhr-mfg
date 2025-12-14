import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { UsersList } from "~/components/users/UsersList";
import { KanbanCardRow, UserRow } from "~/lib/supabase/database.types";

type AssignCardDialogProps = {
  card: KanbanCardRow;
};

export function AssignCardDialog({ card }: AssignCardDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const assignedUser = useQuery<UserRow>({
    queryKey: ["users", card.assignee],
    queryFn: async () => {
      const response = await fetch(`/api/users/${card.assignee}`);
      return response.json();
    },
    enabled: !!card.assignee,
  });

  const assignCard = useMutation({
    mutationFn: async (assignee: string) => {
      const response = await fetch(`/api/kanban/cards/${card.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignee }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to assign card");
      }

      return response.json();
    },
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["kanban-cards"] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="hover:bg-primary/10 flex cursor-pointer items-center gap-3 rounded-md p-2">
          <div className="bg-primary/10 flex size-8 items-center justify-center rounded-full">
            <User className="text-primary size-4" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Assignee</p>
            <p className="font-medium">
              {assignedUser.data?.name || "Unassigned"}
            </p>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Card To</DialogTitle>
        </DialogHeader>
        <UsersList
          onSelect={(user) => assignCard.mutateAsync(user.onshape_user_id)}
        />
      </DialogContent>
    </Dialog>
  );
}
