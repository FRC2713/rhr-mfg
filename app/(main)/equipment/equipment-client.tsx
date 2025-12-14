"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EquipmentRow } from "~/lib/supabase/database.types";
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
  return data.equipment as EquipmentRow[];
}

export function EquipmentClient() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<EquipmentFilters>({
    category: "",
    status: "",
    location: "",
  });

  const { data: equipment = [], isLoading, error } = useQuery({
    queryKey: ["equipment"],
    queryFn: fetchEquipment,
  });

  // Extract unique categories and locations for filters
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    equipment.forEach((item) => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    return Array.from(categories).sort();
  }, [equipment]);

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
        const matchesSearch =
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category && item.category !== filters.category) {
        return false;
      }

      // Status filter
      if (filters.status && item.status !== filters.status) {
        return false;
      }

      // Location filter
      if (filters.location && item.location !== filters.location) {
        return false;
      }

      return true;
    });
  }, [equipment, searchQuery, filters]);

  const handleEdit = (equipment: EquipmentRow) => {
    setSelectedEquipment(equipment);
    setEditDialogOpen(true);
  };

  const handleDelete = (equipment: EquipmentRow) => {
    setSelectedEquipment(equipment);
    setDeleteDialogOpen(true);
  };

  const handleViewDetails = (equipment: EquipmentRow) => {
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

      {(availableCategories.length > 0 ||
        availableLocations.length > 0 ||
        filters.category ||
        filters.status ||
        filters.location) && (
        <EquipmentFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          availableCategories={availableCategories}
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

