import { useState, useEffect, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, User, Wrench, Box } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Sheet, SheetTrigger } from "~/components/ui/sheet";
import type { KanbanCardRow, UserRow } from "~/lib/supabase/database.types";
import { KanbanCardHeader } from "./KanbanCardHeader";
import { KanbanCardDetails } from "./KanbanCardDetails";

/**
 * Format a date string for display
 * Returns "Invalid date" for invalid date strings
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 days")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

/**
 * Get due date urgency info
 */
function getDueDateUrgency(dateString: string): {
  variant: "destructive" | "secondary" | "outline";
  className?: string;
} {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return { variant: "secondary" };

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { variant: "destructive" }; // Overdue
  if (diffDays <= 2)
    return {
      variant: "outline",
      className:
        "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    }; // Due soon
  return { variant: "secondary" };
}

/**
 * Delete a card via the API
 */
async function deleteCardRequest(cardId: string): Promise<unknown> {
  const response = await fetch(`/api/kanban/cards/${cardId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to delete card");
  }

  return response.json();
}

interface KanbanCardProps {
  card: KanbanCardRow;
  hideImages?: boolean;
}

export function KanbanCard({ card, hideImages = false }: KanbanCardProps) {
  const [imageError, setImageError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const queryClient = useQueryClient();

  // Ensure imageUrl is properly formatted
  const imageUrl = useMemo(() => {
    if (!card.image_url || hideImages) return undefined;

    // If it's already our proxy endpoint, use as is
    // This is the format we now store: /api/onshape/thumbnail?url=...
    if (card.image_url.startsWith("/api/onshape/thumbnail")) {
      return card.image_url;
    }

    // If it's a direct Onshape URL, wrap it in our proxy
    // We check for onshape.com domain to identify direct Onshape URLs
    // This handles backward compatibility with old cards
    if (card.image_url.includes("onshape.com")) {
      return `/api/onshape/thumbnail?url=${encodeURIComponent(card.image_url)}`;
    }

    // Otherwise assume it's a public URL and use as is
    // (backward compatibility for any legacy URLs)
    return card.image_url;
  }, [card.image_url]);

  // Reset error state when imageUrl changes
  useEffect(() => {
    setImageError(false);
  }, [card.image_url]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Delete card mutation with retry logic
  const deleteCardMutation = useMutation({
    mutationFn: deleteCardRequest,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-cards"] });
      toast.success("Card deleted");
      setSheetOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to delete card", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const handleDelete = () => {
    deleteCardMutation.mutate(card.id);
  };

  const hasMeta =
    card.assignee || card.material || card.machine || card.due_date;

  const assignedUser = useQuery<UserRow>({
    queryKey: ["users", card.assignee],
    queryFn: async () => {
      const response = await fetch(`/api/users/${card.assignee}`);
      return response.json();
    },
  });

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Card
          ref={setNodeRef}
          style={style}
          className={`transition-all duration-200 ${
            isDragging
              ? "border-l-primary ring-primary/20 scale-105 rotate-2 shadow-2xl ring-2"
              : "hover:border-l-primary/50 hover:border-l-4 hover:shadow-md"
          }`}
        >
          <div className="flex flex-col items-start justify-between gap-2">
            <KanbanCardHeader
              title={card.title}
              attributes={attributes}
              listeners={listeners}
            />
            <div className="flex w-full justify-center px-2">
              {/* Card Image - Clickable to open drawer */}
              {imageUrl && !imageError && !hideImages && (
                <button
                  className="w-full px-2.5 pb-2 text-left sm:px-3"
                  aria-label="View card details"
                >
                  <img
                    src={imageUrl}
                    alt={card.title}
                    className="pointer-events-none h-auto w-full object-contain"
                    onError={() => setImageError(true)}
                    style={{ maxHeight: "120px" }}
                  />
                </button>
              )}
            </div>

            {/* Card Meta */}
            {hasMeta && (
              <CardContent className="flex flex-wrap gap-1.5 px-2.5 pt-0 pb-2.5 sm:px-3 sm:pb-3">
                {card.assignee && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/5 gap-1 text-xs font-normal"
                  >
                    <User className="size-3" />
                    {assignedUser.data?.name || "??"}
                  </Badge>
                )}
                {card.material && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-amber-500/10 text-xs font-normal text-amber-700 dark:text-amber-400"
                  >
                    <Box className="size-3" />
                    {card.material}
                  </Badge>
                )}
                {card.machine && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-blue-500/10 text-xs font-normal text-blue-700 dark:text-blue-400"
                  >
                    <Wrench className="size-3" />
                    {card.machine}
                  </Badge>
                )}
                {card.due_date &&
                  (() => {
                    const urgency = getDueDateUrgency(card.due_date);
                    return (
                      <Badge
                        variant={urgency.variant}
                        className={`gap-1 text-xs font-normal ${urgency.className || ""}`}
                      >
                        <Calendar className="size-3" />
                        {formatRelativeTime(card.due_date)}
                      </Badge>
                    );
                  })()}
              </CardContent>
            )}
          </div>
        </Card>
      </SheetTrigger>

      <KanbanCardDetails
        card={card}
        imageUrl={imageUrl}
        deleteCardMutation={deleteCardMutation}
        onDelete={handleDelete}
      />
    </Sheet>
  );
}
