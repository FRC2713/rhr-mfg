import { Search, ArrowUpDown, RefreshCw } from "lucide-react";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Separator } from "~/components/ui/separator";

type SortBy =
  | "none"
  | "name"
  | "partNumber"
  | "material"
  | "mfgState"
  | "createdAt"
  | "updatedAt";
type SortDirection = "asc" | "desc";

interface OnshapeConnectorToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (direction: SortDirection) => void;
  onRefresh: () => void;
  isFetching: boolean;
}

export function OnshapeConnectorToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  onRefresh,
  isFetching,
}: OnshapeConnectorToolbarProps) {
  const handleSortDirectionToggle = () => {
    onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc");
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="w-full space-y-2 sm:w-[200px]">
          <Select
            value={sortBy}
            onValueChange={(value) => onSortByChange(value as SortBy)}
          >
            <SelectTrigger id="sort-select">
              <SelectValue placeholder="No sorting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No sorting</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="partNumber">Part Number</SelectItem>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="mfgState">Manufacturing State</SelectItem>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {sortBy !== "none" && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleSortDirectionToggle}
            title={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
            className="h-10 w-10"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          title="Refresh data"
          className="h-10 w-10"
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
}
