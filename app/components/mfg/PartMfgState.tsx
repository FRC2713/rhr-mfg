"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { BtPartMetadataInfo } from "~/lib/onshapeApi/generated-wrapper";
import type { KanbanCard } from "~/api/kanban/cards/types";
import type { KanbanColumn } from "~/api/kanban/config/route";
import { PartDueDate } from "./PartDueDate";

import type { PartsPageSearchParams } from "~/mfg/parts/page";

interface PartMfgStateProps {
  part: BtPartMetadataInfo;
  queryParams: PartsPageSearchParams;
  cards: KanbanCard[];
  columns: KanbanColumn[];
}

/**
 * Component to display manufacturing tracking state for a part
 */
export function PartMfgState({
  part,
  queryParams,
  cards,
  columns,
}: PartMfgStateProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
  } | null>(null);
  const hasRevalidatedRef = useRef(false);

  // Reset revalidation flag when starting a new operation
  useEffect(() => {
    if (isSubmitting) {
      hasRevalidatedRef.current = false;
    }
  }, [isSubmitting]);

  // Handle successful card operations - invalidate queries to refetch
  useEffect(() => {
    if (result?.success && !isSubmitting && !hasRevalidatedRef.current) {
      hasRevalidatedRef.current = true;

      // Invalidate both cards and columns queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["kanban-cards"] });
      queryClient.invalidateQueries({ queryKey: ["kanban-columns"] });
    }
  }, [result?.success, isSubmitting, queryClient]);

  // Don't show anything if part has no part number
  if (!part.partNumber) {
    return null;
  }

  // Find card with matching title (exact match)
  const matchingCard = cards.find((card) => card.title === part.partNumber);

  // Find current column if card exists
  const currentColumn = matchingCard
    ? columns.find((col) => col.id === matchingCard.columnId)
    : null;

  const handleAddCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    const formData = new FormData();
    formData.append("action", "addCard");
    formData.append("partNumber", part.partNumber || "");
    if (queryParams.documentId) {
      formData.append("documentId", queryParams.documentId);
      formData.append("instanceType", queryParams.instanceType);
      formData.append("instanceId", queryParams.instanceId || "");
      formData.append("elementId", queryParams.elementId || "");
      formData.append("partId", part.partId || part.id || "");
    }

    try {
      const response = await fetch("/api/mfg/parts/actions", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: "Failed to add card" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If card not found, show "Add to manufacturing tracker" button
  if (!matchingCard) {
    return (
      <div className="space-y-2">
        <form onSubmit={handleAddCard}>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add to manufacturing tracker"}
          </Button>
        </form>
        {result && !result.success && result.error && (
          <p className="text-destructive text-xs">{result.error}</p>
        )}
      </div>
    );
  }

  // If card found, show dropdown with column selection and badge
  const handleColumnChange = async (newColumnId: string) => {
    setIsSubmitting(true);
    setResult(null);

    const formData = new FormData();
    formData.append("action", "moveCard");
    formData.append("cardId", matchingCard.id);
    formData.append("columnId", newColumnId);

    try {
      const response = await fetch("/api/mfg/parts/actions", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: "Failed to move card" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Manufacturing State:</Label>
      <Select
        value={currentColumn?.id || ""}
        onValueChange={handleColumnChange}
        disabled={isSubmitting}
      >
        <SelectTrigger className="h-8 w-full">
          <SelectValue placeholder="Select column...">
            {currentColumn?.title || "Select column..."}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {columns.map((column) => (
            <SelectItem key={column.id} value={column.id}>
              {column.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <PartDueDate
        card={matchingCard}
        part={part}
        queryParams={queryParams}
        columns={columns}
      />
      {result && !result.success && result.error && (
        <p className="text-destructive text-xs">{result.error}</p>
      )}
    </div>
  );
}
