"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EquipmentRow, ProcessRow } from "~/lib/supabase/database.types";
import { EquipmentHeader } from "~/components/mfg/equipment/EquipmentHeader";
import { EquipmentGrid } from "~/components/mfg/equipment/EquipmentGrid";
import { AddEquipmentDialog } from "~/components/mfg/equipment/AddEquipmentDialog";
import { EditEquipmentDialog } from "~/components/mfg/equipment/EditEquipmentDialog";
import { DeleteEquipmentDialog } from "~/components/mfg/equipment/DeleteEquipmentDialog";
import { EquipmentDetailsSheet } from "~/components/mfg/equipment/EquipmentDetailsSheet";
import { EquipmentFiltersComponent, type EquipmentFilters } from "~/components/mfg/equipment/EquipmentFilters";

async function fetchEquipment() {
  const response = await fetch("/api/equipment");
  if (!response.ok) {
    throw new Error("Failed to fetch equipment");
  }
  const data = await response.json();
  return data.equipment as (EquipmentRow & { processes?: ProcessRow[] })[];
}

export function EquipmentClient() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<
    (EquipmentRow & { processes?: ProcessRow[] }) | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<EquipmentFilters>({
    processIds: [],
    statuses: [],
    locations: [],
  });

  const { data: equipment = [], isLoading, error } = useQuery({
    queryKey: ["equipment"],
    queryFn: fetchEquipment,
  });

  // Extract unique locations for filters
  const availableLocations = useMemo(() => {
    const locations = new Set<string>();
    equipment.forEach((item) => {
      if (item.location) {
        locations.add(item.location);
      }
    });
    return Array.from(locations).sort();
  }, [equipment]);

  // Filter equipment based on search and filters
  const filteredEquipment = useMemo(() => {
    return equipment.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const processNames =
          item.processes?.map((p) => p.name.toLowerCase()).join(" ") || "";
        const matchesSearch =
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          processNames.includes(query) ||
          item.location?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Process filter - check if any selected processIds match item's processes
      if (
        filters.processIds.length > 0 &&
        !item.processes?.some((p) => filters.processIds.includes(p.id))
      ) {
        return false;
      }

      // Status filter - check if item's status is in selected statuses
      if (filters.statuses.length > 0 && !filters.statuses.includes(item.status as any)) {
        return false;
      }

      // Location filter - check if item's location is in selected locations
      if (
        filters.locations.length > 0 &&
        !filters.locations.includes(item.location || "")
      ) {
        return false;
      }

      return true;
    });
  }, [equipment, searchQuery, filters]);

  const handleEdit = (
    equipment: EquipmentRow & { processes?: ProcessRow[] }
  ) => {
    setSelectedEquipment(equipment);
    setEditDialogOpen(true);
  };

  const handleDelete = (
    equipment: EquipmentRow & { processes?: ProcessRow[] }
  ) => {
    setSelectedEquipment(equipment);
    setDeleteDialogOpen(true);
  };

  const handleViewDetails = (
    equipment: EquipmentRow & { processes?: ProcessRow[] }
  ) => {
    setSelectedEquipment(equipment);
    setDetailsSheetOpen(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border p-12 text-center">
        <p className="text-destructive mb-2 font-semibold">Error loading equipment</p>
        <p className="text-muted-foreground text-sm">
          {error instanceof Error ? error.message : "An unknown error occurred"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EquipmentHeader
        onAddClick={() => setAddDialogOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {(availableLocations.length > 0 ||
        filters.processIds.length > 0 ||
        filters.statuses.length > 0 ||
        filters.locations.length > 0) && (
        <EquipmentFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          availableLocations={availableLocations}
        />
      )}

      <EquipmentGrid
        equipment={filteredEquipment}
        loading={isLoading}
        onEquipmentClick={handleViewDetails}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewDetails={handleViewDetails}
        onAddClick={() => setAddDialogOpen(true)}
      />

      <AddEquipmentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <EditEquipmentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        equipment={selectedEquipment}
      />

      <DeleteEquipmentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        equipment={selectedEquipment}
      />

      <EquipmentDetailsSheet
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        equipment={selectedEquipment}
        onEdit={() => {
          setDetailsSheetOpen(false);
          handleEdit(selectedEquipment!);
        }}
        onDelete={() => {
          setDetailsSheetOpen(false);
          handleDelete(selectedEquipment!);
        }}
      />
    </div>
  );
}

