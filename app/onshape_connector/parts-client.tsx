"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Box, AlertCircle } from "lucide-react";
import { PartCardSkeleton } from "~/components/mfg/PartCardSkeleton";
import { PartCard } from "~/components/mfg/PartCard";
import { ErrorDisplay } from "~/components/mfg/ErrorDisplay";
import { OnshapeConnectorToolbar } from "./OnshapeConnectorToolbar";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { useState } from "react";
import { usePartsData } from "./hooks/usePartsData";
import { usePartsSearch } from "./hooks/usePartsSearch";
import {
  usePartsSort,
  type SortBy,
  type SortDirection,
} from "./hooks/usePartsSort";
import { getPartsQueryKey } from "./utils/partsQuery";
import { kanbanQueryKeys } from "~/lib/kanbanApi/queries";
import type { PartsPageSearchParams } from "./page";

interface MfgPartsClientProps {
  queryParams: PartsPageSearchParams;
  error: string | null;
  exampleUrl: string | null | undefined;
}

//example url: http://localhost:3000/onshape_connector?elementType=PARTSTUDIO&documentId=6fcef187b1ff2c7d43932486&instanceType=w&instanceId=0330c62599ec344c4a9b77a5&elementId=21aa6247faa0fb5954a76f5b

export function MfgPartsClient({
  queryParams,
  error: validationError,
  exampleUrl,
}: MfgPartsClientProps) {
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Fetch all data using unified hook
  const {
    parts,
    cardByPartNumber,
    columnById,
    isLoading,
    isError,
    error,
    partsError,
    cardsError,
    columnsError,
  } = usePartsData({ queryParams });

  // Search functionality
  const { searchQuery, setSearchQuery, filteredParts, isSearching } =
    usePartsSearch({ parts });

  // Sort functionality
  const sortedParts = usePartsSort({
    parts: filteredParts,
    sortBy,
    sortDirection,
    cardByPartNumber,
    columnById,
  });

  const handleRefresh = () => {
    // Invalidate all relevant queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.cards() });
    queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.columns() });
    queryClient.invalidateQueries({ queryKey: getPartsQueryKey(queryParams) });
  };

  // Determine if we should show loading state
  const showLoading = isLoading && queryParams?.documentId;

  // Combine all errors
  const displayError =
    validationError ||
    (partsError ? String(partsError.message) : null) ||
    (cardsError
      ? `Failed to load kanban cards: ${cardsError.message}`
      : null) ||
    (columnsError ? `Failed to load columns: ${columnsError.message}` : null);

  // Show loading screen while data is being fetched
  if (showLoading) {
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
        {/* Error Messages */}
        {displayError && (
          <ErrorDisplay
            error={displayError}
            exampleUrl={exampleUrl || undefined}
          />
        )}

        {/* Partial error states - show data even if some queries failed */}
        {(cardsError || columnsError) && !partsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Partial data loaded</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>
                {cardsError && "Kanban cards failed to load. "}
                {columnsError && "Columns failed to load. "}
                Parts data is available, but some features may be limited.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="ml-4"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Sort Controls */}
        {parts && !displayError && (
          <OnshapeConnectorToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortDirection={sortDirection}
            onSortDirectionChange={setSortDirection}
            onRefresh={handleRefresh}
            isFetching={isLoading}
            resultCount={sortedParts.length}
            totalCount={parts.length}
            isSearching={isSearching}
          />
        )}

        <Separator />

        {/* Parts List */}
        {parts && parts.length === 0 && !displayError && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No parts found in this Part Studio.
              </p>
            </CardContent>
          </Card>
        )}

        {parts && parts.length > 0 && queryParams && (
          <div>
            {sortedParts.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2 text-center">
                    <p className="text-muted-foreground">
                      No parts match your search query.
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedParts.map((part) => {
                  // Generate a stable key - prefer partId, fallback to id, then partIdentity
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
