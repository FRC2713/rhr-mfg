import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
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
import type { KanbanCard as KanbanCardType } from "~/routes/api.kanban.cards/types";

interface KanbanCardProps {
  card: KanbanCardType;
}

export function KanbanCard({ card }: KanbanCardProps) {
  const [imageError, setImageError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const queryClient = useQueryClient();

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
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Delete card mutation
  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const response = await fetch(`/api/kanban/cards/${cardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete card");
      }

      return response.json();
    },
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

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className="mb-3 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 flex-1 text-sm font-semibold">
              {card.title}
            </h3>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={handleInfoClick}
                >
                  <Info className="size-4" />
                  <span className="sr-only">View details</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>{card.title}</SheetTitle>
                  <SheetDescription>
                    Card details and information
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {card.imageUrl && !imageError && (
                    <div className="w-full">
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className="bg-muted h-auto w-full rounded border"
                        onError={() => setImageError(true)}
                        style={{ maxHeight: "400px", objectFit: "contain" }}
                      />
                    </div>
                  )}

                  {card.content && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">
                        Description
                      </h4>
                      <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                        {card.content}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {card.assignee && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                          Assignee:
                        </span>
                        <span className="font-medium">{card.assignee}</span>
                      </div>
                    )}

                    {card.material && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                          Material:
                        </span>
                        <Badge variant="secondary">{card.material}</Badge>
                      </div>
                    )}

                    {card.machine && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                          Machine:
                        </span>
                        <Badge variant="outline">{card.machine}</Badge>
                      </div>
                    )}

                    {card.dueDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                          Due Date:
                        </span>
                        <span className="font-medium">
                          {formatDate(card.dueDate)}
                        </span>
                      </div>
                    )}

                    {card.createdBy && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                          Created By:
                        </span>
                        <span className="font-medium">{card.createdBy}</span>
                      </div>
                    )}

                    <div className="border-t pt-3">
                      <div className="text-muted-foreground flex items-center justify-between text-xs">
                        <span>Created:</span>
                        <span>{formatDate(card.dateCreated)}</span>
                      </div>

                      {card.dateCreated !== card.dateUpdated && (
                        <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                          <span>Updated:</span>
                          <span>{formatDate(card.dateUpdated)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          disabled={deleteCardMutation.isPending}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete Card
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the card "{card.title}".
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
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        {card.imageUrl && !imageError && (
          <CardContent className="pt-0">
            <img
              src={card.imageUrl}
              alt={card.title}
              className="bg-muted h-auto w-full rounded border"
              onError={() => setImageError(true)}
              style={{ maxHeight: "150px", objectFit: "contain" }}
            />
          </CardContent>
        )}
      </Card>
    </>
  );
}
