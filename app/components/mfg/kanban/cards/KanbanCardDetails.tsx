import { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  Trash2,
  User,
  Wrench,
  Box,
  ExternalLink,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
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
import type {
  KanbanCardRow,
  UserRow,
  ProcessRow,
} from "~/lib/supabase/database.types";
import { Badge } from "~/components/ui/badge";
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

/**
 * Extract Onshape properties from image URL
 * Returns null if the URL doesn't contain Onshape data
 */
function extractOnshapeProperties(imageUrl?: string): {
  documentId: string;
  instanceType: string;
  instanceId: string;
  elementId: string;
} | null {
  if (!imageUrl) return null;

  try {
    // Check if it's our proxy format: /api/onshape/thumbnail?url=...
    if (imageUrl.startsWith("/api/onshape/thumbnail")) {
      // Parse query parameters manually or use URLSearchParams
      const queryString = imageUrl.includes("?") ? imageUrl.split("?")[1] : "";
      const params = new URLSearchParams(queryString);
      const originalUrl = params.get("url");
      if (!originalUrl) return null;

      // Decode the URL if it's encoded
      const decodedUrl = decodeURIComponent(originalUrl);

      // Parse the Onshape thumbnail URL
      // Format: https://cad.onshape.com/api/v10/thumbnails/d/{documentId}/{wvm}/{instanceId}/e/{elementId}/p/{partId}?...
      const thumbnailMatch = decodedUrl.match(
        /\/api\/v10\/thumbnails\/d\/([^\/]+)\/([wvm])\/([^\/]+)\/e\/([^\/]+)/
      );
      if (thumbnailMatch) {
        const [, documentId, instanceType, instanceId, elementId] =
          thumbnailMatch;
        return { documentId, instanceType, instanceId, elementId };
      }
    }

    // Check if it's a direct Onshape thumbnail URL
    const directMatch = imageUrl.match(
      /\/api\/v10\/thumbnails\/d\/([^\/]+)\/([wvm])\/([^\/]+)\/e\/([^\/]+)/
    );
    if (directMatch) {
      const [, documentId, instanceType, instanceId, elementId] = directMatch;
      return { documentId, instanceType, instanceId, elementId };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Construct Onshape document URL from properties
 */
function buildOnshapeDocumentUrl(properties: {
  documentId: string;
  instanceType: string;
  instanceId: string;
  elementId: string;
}): string {
  const { documentId, instanceType, instanceId, elementId } = properties;
  // Onshape document URLs use 'w' for workspace, 'v' for version, 'm' for microversion
  // We'll use the instanceType from the thumbnail URL
  const wvm = instanceType === "w" ? "w" : instanceType === "v" ? "v" : "m";
  return `https://cad.onshape.com/documents/${documentId}/${wvm}/${instanceId}/e/${elementId}`;
}

interface KanbanCardDetailsProps {
  card: KanbanCardRow & { processes?: ProcessRow[] };
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

  // Extract Onshape properties from image URL
  const onshapeProperties = useMemo(
    () => extractOnshapeProperties(imageUrl),
    [imageUrl]
  );

  // Build Onshape document URL if properties are available
  const onshapeUrl = useMemo(() => {
    if (!onshapeProperties) return null;
    return buildOnshapeDocumentUrl(onshapeProperties);
  }, [onshapeProperties]);

  const hasMeta =
    card.assignee ||
    card.material ||
    card.machine ||
    card.due_date ||
    (card.processes && card.processes.length > 0);

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
            <div className="relative w-full" style={{ height: "300px" }}>
              <Image
                src={imageUrl}
                alt={card.title}
                fill
                className="object-contain"
                onError={() => setImageError(true)}
                unoptimized
              />
            </div>
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

              {card.processes && card.processes.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-blue-500/10">
                    <Wrench className="size-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-muted-foreground mb-1 text-xs">
                      Required Processes
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {card.processes.map((process) => (
                        <Badge
                          key={process.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {process.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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

      {/* Actions - Sticky at bottom */}
      <div className="mt-auto space-y-2 border-t pt-4">
        {/* Open in Onshape Button */}
        {onshapeUrl && (
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() =>
              window.open(onshapeUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="mr-2 size-4" />
            Open in Onshape
          </Button>
        )}

        {/* Delete Action */}
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
