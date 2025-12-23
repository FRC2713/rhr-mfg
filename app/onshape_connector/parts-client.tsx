"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import Fuse from "fuse.js";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Box } from "lucide-react";
import { PartCardSkeleton } from "~/components/mfg/PartCardSkeleton";
import { PartCard } from "~/components/mfg/PartCard";
import { ErrorDisplay } from "~/components/mfg/ErrorDisplay";
import type { BtPartMetadataInfo } from "~/lib/onshapeApi/generated-wrapper";
import type { KanbanCardRow } from "~/lib/supabase/database.types";
import type { KanbanColumn } from "~/api/kanban/config/route";
import { PartsPageSearchParams } from "./page";
import { getPartsQueryOptions, getPartsQueryKey } from "./utils/partsQuery";
import { OnshapeConnectorToolbar } from "./OnshapeConnectorToolbar";
import { Separator } from "~/components/ui/separator";

interface MfgPartsClientProps {
  queryParams: PartsPageSearchParams;
  error: string | null;
  exampleUrl: string | null | undefined;
}

export function MfgPartsClient({
  queryParams,
  error: validationError,
  exampleUrl,
}: MfgPartsClientProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    | "none"
    | "name"
    | "partNumber"
    | "material"
    | "mfgState"
    | "createdAt"
    | "updatedAt"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Debounce search query to avoid recalculating on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Kanban data client-side
  const kanbanCardsQuery = useQuery<{ cards: KanbanCardRow[] }>({
    queryKey: ["kanban-cards"],
    queryFn: async () => {
      const response = await fetch("/api/kanban/cards");
      if (!response.ok) throw new Error("Failed to fetch cards");
      return response.json();
    },
    staleTime: 30 * 1000,
  });

  const kanbanColumnsQuery = useQuery<KanbanColumn[]>({
    queryKey: ["kanban-columns"],
    queryFn: async () => {
      const response = await fetch("/api/kanban/config/columns");
      if (!response.ok) throw new Error("Failed to fetch columns");
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  const kanbanCards = kanbanCardsQuery.data?.cards || [];
  const partsQuery = useQuery<BtPartMetadataInfo[]>(
    getPartsQueryOptions(queryParams)
  );

  // Create lookup maps for O(1) access instead of O(n) .find() operations
  const cardByPartNumber = useMemo(() => {
    const map = new Map<string, KanbanCardRow>();
    kanbanCards.forEach((card) => {
      if (card.title) {
        map.set(card.title, card);
      }
    });
    return map;
  }, [kanbanCards]);

  const columnById = useMemo(() => {
    const map = new Map<string, KanbanColumn>();
    kanbanColumnsQuery.data?.forEach((col) => {
      map.set(col.id, col);
    });
    return map;
  }, [kanbanColumnsQuery.data]);

  // Configure Fuse.js for fuzzy search - only create when needed
  const fuse = useMemo(() => {
    if (partsQuery.data?.length === 0) return null;
    return new Fuse(partsQuery.data || [], {
      keys: ["name", "partNumber"],
      threshold: 0.4, // Lower = more strict, higher = more fuzzy
      ignoreLocation: true, // Search anywhere in the string
      minMatchCharLength: 1,
    });
  }, [partsQuery.data]);

  // Filter parts based on search query (using debounced value)
  const filteredParts = useMemo(() => {
    if (!debouncedSearchQuery.trim() || !fuse) {
      return partsQuery.data || [];
    }
    return fuse.search(debouncedSearchQuery).map((result) => result.item);
  }, [partsQuery.data, fuse, debouncedSearchQuery]);

  // Sort filtered parts
  const sortedParts = useMemo(() => {
    if (sortBy === "none") {
      return filteredParts;
    }

    const partsToSort = [...filteredParts];
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    switch (sortBy) {
      case "name":
        return partsToSort.sort((a, b) => {
          const nameA = (a.name || "").toLowerCase();
          const nameB = (b.name || "").toLowerCase();
          return nameA.localeCompare(nameB) * directionMultiplier;
        });

      case "partNumber":
        return partsToSort.sort((a, b) => {
          const numA = (a.partNumber || "").toLowerCase();
          const numB = (b.partNumber || "").toLowerCase();
          return numA.localeCompare(numB) * directionMultiplier;
        });

      case "material":
        return partsToSort.sort((a, b) => {
          const materialA = (a.material?.displayName || "").toLowerCase();
          const materialB = (b.material?.displayName || "").toLowerCase();
          // Parts without material go to the end
          if (!materialA && !materialB) return 0;
          if (!materialA) return 1;
          if (!materialB) return -1;
          return materialA.localeCompare(materialB) * directionMultiplier;
        });

      case "mfgState": {
        // Sort by manufacturing state (column position) - using lookup maps for O(1) access
        return partsToSort.sort((a, b) => {
          const cardA = a.partNumber
            ? cardByPartNumber.get(a.partNumber)
            : undefined;
          const cardB = b.partNumber
            ? cardByPartNumber.get(b.partNumber)
            : undefined;

          if (!cardA && !cardB) return 0;
          if (!cardA) return 1; // Parts without cards go to the end
          if (!cardB) return -1;

          const columnA = cardA.column_id
            ? columnById.get(cardA.column_id)
            : undefined;
          const columnB = cardB.column_id
            ? columnById.get(cardB.column_id)
            : undefined;

          const positionA = columnA?.position ?? Number.MAX_SAFE_INTEGER;
          const positionB = columnB?.position ?? Number.MAX_SAFE_INTEGER;

          return (positionA - positionB) * directionMultiplier;
        });
      }

      case "createdAt": {
        // Sort by card creation date - using lookup map for O(1) access
        return partsToSort.sort((a, b) => {
          const cardA = a.partNumber
            ? cardByPartNumber.get(a.partNumber)
            : undefined;
          const cardB = b.partNumber
            ? cardByPartNumber.get(b.partNumber)
            : undefined;

          if (!cardA && !cardB) return 0;
          if (!cardA) return 1; // Parts without cards go to the end
          if (!cardB) return -1;

          const dateA = new Date(cardA.date_created).getTime();
          const dateB = new Date(cardB.date_created).getTime();

          // Base sort: newest first (dateB - dateA), then apply direction
          return (dateB - dateA) * directionMultiplier;
        });
      }

      case "updatedAt": {
        // Sort by card last updated date - using lookup map for O(1) access
        return partsToSort.sort((a, b) => {
          const cardA = a.partNumber
            ? cardByPartNumber.get(a.partNumber)
            : undefined;
          const cardB = b.partNumber
            ? cardByPartNumber.get(b.partNumber)
            : undefined;

          if (!cardA && !cardB) return 0;
          if (!cardA) return 1; // Parts without cards go to the end
          if (!cardB) return -1;

          const dateA = new Date(cardA.date_updated).getTime();
          const dateB = new Date(cardB.date_updated).getTime();

          // Base sort: most recently updated first (dateB - dateA), then apply direction
          return (dateB - dateA) * directionMultiplier;
        });
      }

      default:
        return partsToSort;
    }
  }, [filteredParts, sortBy, sortDirection, cardByPartNumber, columnById]);

  const error =
    validationError || (partsQuery.error ? String(partsQuery.error) : null);

  const handleRefresh = () => {
    // Invalidate all relevant queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: ["kanban-cards"] });
    queryClient.invalidateQueries({ queryKey: ["kanban-columns"] });
    queryClient.invalidateQueries({ queryKey: getPartsQueryKey(queryParams) });
  };

  // Show loading screen while data is being fetched
  if (partsQuery.isFetching && queryParams?.documentId) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Box className="h-8 w-8" />
                <Skeleton className="h-8 w-48" />
              </div>
              <Skeleton className="h-5 w-32" />
            </div>
          </div>

          {/* Parts Grid Skeleton */}
          <div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <PartCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        {/* Error Message */}
        {error && (
          <ErrorDisplay error={error} exampleUrl={exampleUrl || undefined} />
        )}

        {/* Search and Sort Controls */}
        {partsQuery.data && !error && (
          <OnshapeConnectorToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortDirection={sortDirection}
            onSortDirectionChange={setSortDirection}
            onRefresh={handleRefresh}
            isFetching={
              kanbanCardsQuery.isFetching ||
              kanbanColumnsQuery.isFetching ||
              partsQuery.isFetching
            }
          />
        )}

        <Separator />

        {/* Parts List */}
        {partsQuery.data && partsQuery.data.length === 0 && !error && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No parts found in this Part Studio.
              </p>
            </CardContent>
          </Card>
        )}

        {partsQuery.data && partsQuery.data.length > 0 && queryParams && (
          <div>
            {sortedParts.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center">
                    No parts match your search query.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedParts.map((part) => {
                  // Generate a stable key - prefer partId, fallback to id, then partIdentity
                  // Avoid JSON.stringify as it's expensive
                  const partKey =
                    part.partId ||
                    part.id ||
                    part.partIdentity ||
                    `${part.name || "unknown"}-${part.partNumber || "no-number"}`;

                  // Find matching card and column using lookup maps (O(1) access)
                  const matchingCard = part.partNumber
                    ? cardByPartNumber.get(part.partNumber)
                    : undefined;
                  const currentColumn = matchingCard?.column_id
                    ? columnById.get(matchingCard.column_id)
                    : undefined;

                  return (
                    <PartCard
                      key={partKey}
                      part={part}
                      queryParams={queryParams}
                      matchingCard={matchingCard}
                      currentColumn={currentColumn}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
