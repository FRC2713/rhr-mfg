import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { BtPartMetadataInfo } from "~/lib/onshapeApi/generated-wrapper";
import type { KanbanCardRow } from "~/lib/supabase/database.types";
import type { KanbanColumn } from "~/api/kanban/config/route";
import type { PartsPageSearchParams } from "~/onshape_connector/page";
import { PartCardThumbnail } from "./PartCardThumbnail";
import { PartNumberInput } from "./PartNumberInput";
import { PartMfgState } from "./PartMfgState";

interface PartCardProps {
  part: BtPartMetadataInfo;
  queryParams: PartsPageSearchParams;
  matchingCard?: KanbanCardRow;
  currentColumn?: KanbanColumn;
}

/**
 * Component to display a single part with thumbnail error handling
 */
export function PartCard({
  part,
  queryParams,
  matchingCard,
  currentColumn,
}: PartCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">
            {part.name || `Part ${part.partId || part.id || "Unknown"}`}
          </CardTitle>
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
          matchingCard={matchingCard}
          currentColumn={currentColumn}
        />
      </CardContent>
    </Card>
  );
}
