"use client";

import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import type { KanbanColumn } from "~/api/kanban/config/route";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import type { BtPartMetadataInfo } from "~/lib/onshapeApi/generated-wrapper";
import type { KanbanCardRow } from "~/lib/supabase/database.types";
import { type AddCardFormData, AddCardDialog } from "./AddCardDialog";
import { PartDueDate } from "./PartDueDate";

import type { PartsPageSearchParams } from "~/onshape_connector/page";
import { ManufacturingStateBadge } from "./ManufacturingStateBadge";

interface PartMfgStateProps {
  part: BtPartMetadataInfo;
  queryParams: PartsPageSearchParams;
  matchingCard?: KanbanCardRow;
  currentColumn?: KanbanColumn;
}

/**
 * Component to display manufacturing tracking state for a part
 */
export function PartMfgState({
  part,
  queryParams,
  matchingCard,
  currentColumn,
}: PartMfgStateProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const handleAddCard = async (formData: AddCardFormData) => {
    setIsSubmitting(true);
    setResult(null);
    setDialogOpen(false);

    const submitFormData = new FormData();
    submitFormData.append("action", "addCard");
    submitFormData.append("partNumber", part.partNumber || "");

    // Add process IDs
    formData.processIds.forEach((processId) => {
      submitFormData.append("processIds", processId);
    });

    // Add quantities
    submitFormData.append(
      "quantityPerRobot",
      String(formData.quantityPerRobot)
    );
    submitFormData.append("quantityToMake", String(formData.quantityToMake));

    // Add due date if provided
    if (formData.dueDate) {
      submitFormData.append("dueDate", format(formData.dueDate, "yyyy-MM-dd"));
    }

    if (queryParams.documentId) {
      submitFormData.append("documentId", queryParams.documentId);
      submitFormData.append("instanceType", queryParams.instanceType);
      submitFormData.append("instanceId", queryParams.instanceId || "");
      submitFormData.append("elementId", queryParams.elementId || "");
      submitFormData.append("partId", part.partId || part.id || "");
    }

    // Extract raw thumbnail URL (same strategy as PartCardThumbnail)
    const rawThumbnailUrl =
      part.thumbnailInfo?.sizes?.find((s) => s.size === "300x300")?.href ||
      part.thumbnailInfo?.sizes?.[0]?.href ||
      part.thumbnailInfo?.sizes?.find((s) => s.size === "600x340")?.href;
    if (rawThumbnailUrl) {
      submitFormData.append("rawThumbnailUrl", rawThumbnailUrl);
    }

    try {
      const response = await fetch("/api/mfg/parts/actions", {
        method: "POST",
        body: submitFormData,
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: "Failed to add card" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If card not found, show "Add to manufacturing tracker" button with dialog
  if (!matchingCard) {
    return (
      <div className="space-y-2">
        <AddCardDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleAddCard}
          isSubmitting={isSubmitting}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          disabled={isSubmitting}
          onClick={() => setDialogOpen(true)}
        >
          Add to manufacturing tracker
        </Button>
        {result && !result.success && result.error && (
          <p className="text-destructive text-xs">{result.error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">Manufacturing State:</Label>
      {currentColumn && <ManufacturingStateBadge column={currentColumn} />}

      <PartDueDate card={matchingCard} part={part} queryParams={queryParams} />
      {result && !result.success && result.error && (
        <p className="text-destructive text-xs">{result.error}</p>
      )}
    </div>
  );
}
