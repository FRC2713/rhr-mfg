import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { KanbanCardRow, EquipmentRow } from "~/lib/supabase/database.types";

type MachineSelectDialogProps = {
  card: KanbanCardRow;
};

async function fetchEquipment() {
  const response = await fetch("/api/equipment");
  if (!response.ok) {
    throw new Error("Failed to fetch equipment");
  }
  const data = await response.json();
  return data.equipment as EquipmentRow[];
}

export function MachineSelectDialog({ card }: MachineSelectDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: equipment = [] } = useQuery<EquipmentRow[]>({
    queryKey: ["equipment"],
    queryFn: fetchEquipment,
  });

  const assignMachine = useMutation({
    mutationFn: async (machine: string | null) => {
      const response = await fetch(`/api/kanban/cards/${card.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ machine }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to assign machine");
      }

      return response.json();
    },
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["kanban-cards"] });
    },
  });

  const handleValueChange = (value: string) => {
    const machineValue = value === "none" ? null : value;
    assignMachine.mutate(machineValue);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="hover:bg-primary/10 flex cursor-pointer items-center gap-3 rounded-md p-2">
          <div className="bg-blue-500/10 flex size-8 items-center justify-center rounded-full">
            <Wrench className="text-blue-600 size-4" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Machine</p>
            <p className="font-medium">{card.machine || "Unassigned"}</p>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Machine</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select
            value={card.machine || "none"}
            onValueChange={handleValueChange}
            disabled={assignMachine.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a machine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Unassigned)</SelectItem>
              {equipment.map((item) => (
                <SelectItem key={item.id} value={item.name}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {assignMachine.isPending && (
            <p className="text-muted-foreground text-sm">Updating...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

