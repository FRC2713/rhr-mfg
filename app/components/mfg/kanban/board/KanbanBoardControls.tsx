import { useMemo } from "react";
import { Edit, Save, Settings2, X, Image, Layers, User } from "lucide-react";
import { KanbanConfig } from "~/api/kanban/config/route";
import { Button } from "~/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

interface KanbanBoardControlsProps {
  isEditMode: boolean;
  handleEnterEditMode: () => void;
  config: KanbanConfig | undefined;
  onEditCancel: () => void;
  onEditSave: () => void;
  onHideImages: () => void;
  hideImages: boolean;
  isSaving: boolean;
  groupByProcess: boolean;
  sortByUser: boolean;
  onGroupByProcessChange: (value: boolean) => void;
  onSortByUserChange: (value: boolean) => void;
}

export function KanbanBoardControls({
  isEditMode,
  handleEnterEditMode,
  config,
  onEditCancel,
  onEditSave,
  isSaving,
  onHideImages,
  hideImages,
  groupByProcess,
  sortByUser,
  onGroupByProcessChange,
  onSortByUserChange,
}: KanbanBoardControlsProps) {
  const toggleValues = useMemo(() => {
    const values: string[] = [];
    if (!hideImages) values.push("images");
    if (groupByProcess) values.push("groupByProcess");
    if (sortByUser) values.push("sortByUser");
    return values;
  }, [hideImages, groupByProcess, sortByUser]);

  const handleValueChange = (values: string[]) => {
    const hasImages = values.includes("images");
    const hasGroupByProcess = values.includes("groupByProcess");
    const hasSortByUser = values.includes("sortByUser");

    if (hasImages !== !hideImages) {
      onHideImages();
    }
    if (hasGroupByProcess !== groupByProcess) {
      onGroupByProcessChange(hasGroupByProcess);
    }
    if (hasSortByUser !== sortByUser) {
      onSortByUserChange(hasSortByUser);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <ToggleGroup
        type="multiple"
        variant="outline"
        size="sm"
        value={toggleValues}
        onValueChange={handleValueChange}
      >
        <ToggleGroupItem value="images" aria-label="Toggle images">
          <Image className="size-4" />
          <span className="hidden sm:inline">
            {hideImages ? "Show Images" : "Hide Images"}
          </span>
        </ToggleGroupItem>
        <ToggleGroupItem value="groupByProcess" aria-label="Group by process">
          <Layers className="size-4" />
          <span className="hidden sm:inline">Sort by Process</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="sortByUser" aria-label="Sort by user">
          <User className="size-4" />
          <span className="hidden sm:inline">Sort by User</span>
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Edit Mode Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        {!isEditMode ? (
          <Button
            onClick={handleEnterEditMode}
            variant="outline"
            size="sm"
            disabled={!config}
            className="w-full sm:w-auto"
          >
            <Edit className="mr-2 size-4" />
            <span className="sm:inline">Edit Columns</span>
          </Button>
        ) : (
          <>
            <Button
              onClick={onEditCancel}
              variant="outline"
              size="sm"
              disabled={isSaving}
              className="flex-1 sm:flex-initial"
            >
              <X className="mr-2 size-4" />
              Cancel
            </Button>
            <Button
              onClick={onEditSave}
              size="sm"
              disabled={isSaving}
              className="flex-1 sm:flex-initial"
            >
              <Save className="mr-2 size-4" />
              Save
            </Button>
          </>
        )}
        {/* Status indicator */}
        {isSaving && (
          <div className="bg-muted/80 text-muted-foreground flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
            <Settings2 className="size-3 animate-spin" />
            <span className="hidden sm:inline">Saving...</span>
          </div>
        )}
      </div>
    </div>
  );
}
