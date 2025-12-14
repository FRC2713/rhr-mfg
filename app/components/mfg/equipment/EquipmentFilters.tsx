"use client";

import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { EquipmentStatus } from "./shared/EquipmentStatusBadge";

export interface EquipmentFilters {
  category: string;
  status: EquipmentStatus | "";
  location: string;
}

interface EquipmentFiltersProps {
  filters: EquipmentFilters;
  onFiltersChange: (filters: EquipmentFilters) => void;
  availableCategories: string[];
  availableLocations: string[];
}

export function EquipmentFiltersComponent({
  filters,
  onFiltersChange,
  availableCategories,
  availableLocations,
}: EquipmentFiltersProps) {
  const hasActiveFilters =
    filters.category || filters.status || filters.location;

  const clearFilters = () => {
    onFiltersChange({
      category: "",
      status: "",
      location: "",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.category || undefined}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, category: value })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {availableCategories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
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
