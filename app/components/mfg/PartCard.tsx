import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { BtPartMetadataInfo } from "~/lib/onshapeApi/generated-wrapper";
import type { KanbanCard } from "~/api/kanban/cards/types";
import type { KanbanColumn } from "~/api/kanban/config/route";
import type { PartsQueryParams } from "~/mfg/parts/utils/types";
import { PartCardThumbnail } from "./PartCardThumbnail";
import { PartNumberInput } from "./PartNumberInput";
import { PartMfgState } from "./PartMfgState";
import { ManufacturingStateBadge } from "./ManufacturingStateBadge";

interface PartCardProps {
  part: BtPartMetadataInfo;
  queryParams: PartsQueryParams;
  cards: KanbanCard[];
  columns: KanbanColumn[];
}

/**
 * Component to display a single part with thumbnail error handling
 */
export function PartCard({ part, queryParams, cards, columns }: PartCardProps) {
  // Find matching card for this part (if it has a part number)
  const matchingCard = part.partNumber
    ? cards.find((card) => card.title === part.partNumber)
    : null;

  // Find current column if card exists
  const currentColumn = matchingCard
    ? columns.find((col) => col.id === matchingCard.columnId)
    : null;

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-row flex-wrap items-center gap-2">
            <CardTitle className="text-lg">
              {part.name || `Part ${part.partId || part.id || "Unknown"}`}
            </CardTitle>
            {currentColumn && (
              <ManufacturingStateBadge column={currentColumn} />
            )}
          </div>
          {part.isHidden && <Badge variant="secondary">Hidden</Badge>}
        </div>
        <CardDescription>
          <PartNumberInput part={part} queryParams={queryParams} />
        </CardDescription>
      </CardHeader>
      <PartCardThumbnail part={part} />
      <CardContent className="space-y-4">
        <PartMfgState
          part={part}
          queryParams={queryParams}
          cards={cards}
          columns={columns}
        />
      </CardContent>
    </Card>
  );
}
