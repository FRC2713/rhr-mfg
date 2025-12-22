"use client";

import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { EquipmentStatus } from "./shared/EquipmentStatusBadge";
import type { ProcessRow } from "~/lib/supabase/database.types";

export interface EquipmentFilters {
  processId: string;
  status: EquipmentStatus | "";
  location: string;
}

interface EquipmentFiltersProps {
  filters: EquipmentFilters;
  onFiltersChange: (filters: EquipmentFilters) => void;
  availableLocations: string[];
}

export function EquipmentFiltersComponent({
  filters,
  onFiltersChange,
  availableLocations,
}: EquipmentFiltersProps) {
  // Fetch processes from API
  const { data: processesData } = useQuery<{ processes: ProcessRow[] }>({
    queryKey: ["processes"],
    queryFn: async () => {
      const response = await fetch("/api/processes");
      if (!response.ok) throw new Error("Failed to fetch processes");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const processes = processesData?.processes || [];
  const hasActiveFilters =
    filters.processId || filters.status || filters.location;

  const clearFilters = () => {
    onFiltersChange({
      processId: "",
      status: "",
      location: "",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.processId || undefined}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, processId: value })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Process" />
        </SelectTrigger>
        <SelectContent>
          {processes.map((process) => (
            <SelectItem key={process.id} value={process.id}>
              {process.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status || undefined}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, status: value as EquipmentStatus })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="available">Available</SelectItem>
          <SelectItem value="in-use">In Use</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
          <SelectItem value="retired">Retired</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.location || undefined}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, location: value })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          {availableLocations.map((location) => (
            <SelectItem key={location} value={location}>
              {location}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9"
        >
          <X className="mr-2 size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
