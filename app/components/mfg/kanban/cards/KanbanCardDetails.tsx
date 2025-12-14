import { useState } from "react";
import { Calendar, Clock, Trash2, User, Wrench, Box } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import type { KanbanCardRow, UserRow } from "~/lib/supabase/database.types";
import type { UseMutationResult } from "@tanstack/react-query";
import { AssignCardDialog } from "./AssignCardDialog";
import { MachineSelectDialog } from "./MachineSelectDialog";

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

interface KanbanCardDetailsProps {
  card: KanbanCardRow;
  imageUrl?: string;
  deleteCardMutation: UseMutationResult<unknown, Error, string, unknown>;
  onDelete: () => void;
}

export function KanbanCardDetails({
  card,
  imageUrl,
  deleteCardMutation,
  onDelete,
}: KanbanCardDetailsProps) {
  const [imageError, setImageError] = useState(false);

  const hasMeta =
    card.assignee || card.material || card.machine || card.due_date;

  // Fetch creator name if created_by is set
  const creatorQuery = useQuery<UserRow>({
    queryKey: ["users", card.created_by],
    queryFn: async () => {
      if (!card.created_by) throw new Error("No creator ID");
      const response = await fetch(`/api/users/${card.created_by}`);
      if (!response.ok) throw new Error("Failed to fetch creator");
      return response.json();
    },
    enabled: !!card.created_by,
  });

  return (
    <SheetContent className="flex w-full flex-col sm:max-w-lg">
      <SheetHeader className="space-y-1">
        <SheetTitle className="text-xl">{card.title}</SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          <Clock className="size-3" />
          Created {formatDate(card.date_created)}
          {card.created_by &&
            ` by ${creatorQuery.data?.name || card.created_by}`}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 flex-1 space-y-6 overflow-y-auto px-4">
        {/* Image Section */}
        {imageUrl && !imageError && (
          <div className="bg-muted/50 overflow-hidden rounded-lg border">
            <img
              src={imageUrl}
              alt={card.title}
              className="h-auto w-full object-contain"
              onError={() => setImageError(true)}
              style={{ maxHeight: "300px" }}
            />
          </div>
        )}

        {/* Description */}
        {card.content && (
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              Description
            </h4>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {card.content}
              </p>
            </div>
          </div>
        )}

        {/* Details Grid */}
        {hasMeta && (
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              Details
            </h4>
            <div className="bg-card grid gap-3 rounded-lg border p-4">
              <AssignCardDialog card={card} />

              {card.material && (
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-amber-500/10">
                    <Box className="size-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Material</p>
                    <p className="font-medium">{card.material}</p>
                  </div>
                </div>
              )}

              <MachineSelectDialog card={card} />

              {card.due_date &&
                (() => {
                  const urgency = getDueDateUrgency(card.due_date);
                  const isOverdue = urgency.variant === "destructive";
                  const isSoon = urgency.className !== undefined;
                  return (
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-8 items-center justify-center rounded-full ${
                          isOverdue
                            ? "bg-destructive/10"
                            : isSoon
                              ? "bg-amber-500/10"
                              : "bg-muted"
                        }`}
                      >
                        <Calendar
                          className={`size-4 ${
                            isOverdue
                              ? "text-destructive"
                              : isSoon
                                ? "text-amber-600"
                                : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Due Date
                        </p>
                        <p className="font-medium">
                          {formatDate(card.due_date)}
                          <span className="text-muted-foreground ml-2 text-xs">
                            ({formatRelativeTime(card.due_date)})
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="rounded-lg border border-dashed p-4">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>Created</span>
            <span>{formatDate(card.date_created)}</span>
          </div>
          {card.date_created !== card.date_updated && (
            <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
              <span>Last updated</span>
              <span>{formatDate(card.date_updated)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Action - Sticky at bottom */}
      <div className="mt-auto border-t pt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground w-full"
              disabled={deleteCardMutation.isPending}
            >
              <Trash2 className="mr-2 size-4" />
              {deleteCardMutation.isPending ? "Deleting..." : "Delete Card"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this card?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{card.title}". This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SheetContent>
  );
}
