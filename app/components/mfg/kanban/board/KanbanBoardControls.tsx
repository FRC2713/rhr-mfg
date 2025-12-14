import { Edit, Save, Settings2, X } from "lucide-react";
import { KanbanConfig } from "~/api/kanban/config/route";
import { Button } from "~/components/ui/button";

interface KanbanBoardControlsProps {
  isEditMode: boolean;
  handleEnterEditMode: () => void;
  config: KanbanConfig | undefined;
  onEditCancel: () => void;
  onEditSave: () => void;
  onHideImages: () => void;
  hideImages: boolean;
  isSaving: boolean;
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
}: KanbanBoardControlsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={onHideImages}>
        {hideImages ? "Show Images" : "Hide Images"}
      </Button>

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
