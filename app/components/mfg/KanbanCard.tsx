import { useState, useEffect, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  GripVertical,
  Info,
  Trash2,
  User,
  Wrench,
  Box,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import type { KanbanCard as KanbanCardType } from "~/api/kanban/cards/types";

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
  card: KanbanCardType;
}

export function KanbanCard({ card }: KanbanCardProps) {
  const [imageError, setImageError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const queryClient = useQueryClient();

  // Ensure imageUrl is properly formatted
  const imageUrl = useMemo(() => {
    if (!card.imageUrl) return undefined;

    // If it's already our proxy endpoint, use as is
    // This is the format we now store: /api/onshape/thumbnail?url=...
    if (card.imageUrl.startsWith("/api/onshape/thumbnail")) {
      return card.imageUrl;
    }

    // If it's a direct Onshape URL, wrap it in our proxy
    // We check for onshape.com domain to identify direct Onshape URLs
    // This handles backward compatibility with old cards
    if (card.imageUrl.includes("onshape.com")) {
      return `/api/onshape/thumbnail?url=${encodeURIComponent(card.imageUrl)}`;
    }

    // Otherwise assume it's a public URL and use as is
    // (backward compatibility for any legacy URLs)
    return card.imageUrl;
  }, [card.imageUrl]);

  // Reset error state when imageUrl changes
  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

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

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    card.assignee || card.material || card.machine || card.dueDate;

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={`group relative mb-3 overflow-hidden border-l-4 border-l-transparent transition-all duration-200 ${
          isDragging
            ? "border-l-primary ring-primary/20 scale-105 rotate-2 shadow-2xl ring-2"
            : "hover:border-l-primary/50 hover:shadow-md"
        }`}
      >
        {/* Subtle gradient overlay */}
        <div className="to-muted/30 pointer-events-none absolute inset-0 bg-linear-to-br from-transparent via-transparent" />

        <div className="relative">
          {/* Card Header */}
          <div className="flex items-start gap-2 p-2.5 pb-2 sm:p-3 sm:pb-2">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 cursor-grab touch-none opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
              <GripVertical className="text-muted-foreground size-4" />
            </button>

            {/* Title */}
            <h3 className="line-clamp-2 flex-1 text-xs leading-tight font-semibold sm:text-sm">
              {card.title}
            </h3>

            {/* Info Button */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={handleInfoClick}
                >
                  <Info className="size-4" />
                  <span className="sr-only">View details</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="flex w-full flex-col sm:max-w-lg">
                <SheetHeader className="space-y-1">
                  <SheetTitle className="text-xl">{card.title}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    <Clock className="size-3" />
                    Created {formatDate(card.dateCreated)}
                    {card.createdBy && ` by ${card.createdBy}`}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 flex-1 space-y-6 overflow-y-auto">
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
                        {card.assignee && (
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 flex size-8 items-center justify-center rounded-full">
                              <User className="text-primary size-4" />
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">
                                Assignee
                              </p>
                              <p className="font-medium">{card.assignee}</p>
                            </div>
                          </div>
                        )}

                        {card.material && (
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-amber-500/10">
                              <Box className="size-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">
                                Material
                              </p>
                              <p className="font-medium">{card.material}</p>
                            </div>
                          </div>
                        )}

                        {card.machine && (
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-blue-500/10">
                              <Wrench className="size-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">
                                Machine
                              </p>
                              <p className="font-medium">{card.machine}</p>
                            </div>
                          </div>
                        )}

                        {card.dueDate &&
                          (() => {
                            const urgency = getDueDateUrgency(card.dueDate);
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
                                    {formatDate(card.dueDate)}
                                    <span className="text-muted-foreground ml-2 text-xs">
                                      ({formatRelativeTime(card.dueDate)})
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
                      <span>{formatDate(card.dateCreated)}</span>
                    </div>
                    {card.dateCreated !== card.dateUpdated && (
                      <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                        <span>Last updated</span>
                        <span>{formatDate(card.dateUpdated)}</span>
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
                        {deleteCardMutation.isPending
                          ? "Deleting..."
                          : "Delete Card"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this card?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{card.title}". This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Card Image */}
          {imageUrl && !imageError && (
            <div className="px-2.5 pb-2 sm:px-3">
              <div className="bg-muted/50 overflow-hidden rounded-md border">
                <img
                  src={imageUrl}
                  alt={card.title}
                  className="h-auto w-full object-contain"
                  onError={() => setImageError(true)}
                  style={{ maxHeight: "120px" }}
                />
              </div>
            </div>
          )}

          {/* Card Meta */}
          {hasMeta && (
            <CardContent className="flex flex-wrap gap-1.5 px-2.5 pt-0 pb-2.5 sm:px-3 sm:pb-3">
              {card.assignee && (
                <Badge
                  variant="secondary"
                  className="bg-primary/5 gap-1 text-xs font-normal"
                >
                  <User className="size-3" />
                  {card.assignee}
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
              {card.dueDate &&
                (() => {
                  const urgency = getDueDateUrgency(card.dueDate);
                  return (
                    <Badge
                      variant={urgency.variant}
                      className={`gap-1 text-xs font-normal ${urgency.className || ""}`}
                    >
                      <Calendar className="size-3" />
                      {formatRelativeTime(card.dueDate)}
                    </Badge>
                  );
                })()}
            </CardContent>
          )}
        </div>
      </Card>
    </>
  );
}
