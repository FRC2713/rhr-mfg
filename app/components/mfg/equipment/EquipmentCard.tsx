import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import type { EquipmentRow } from "~/lib/supabase/database.types";
import { EquipmentCategoryChip } from "./shared/EquipmentCategoryChip";
import { EquipmentImage } from "./shared/EquipmentImage";
import { EquipmentStatusBadge } from "./shared/EquipmentStatusBadge";
import { EquipmentActionsMenu } from "./shared/EquipmentActionsMenu";

interface EquipmentCardProps {
  equipment: EquipmentRow;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  onClick?: () => void;
}

export function EquipmentCard({
  equipment,
  onEdit,
  onDelete,
  onViewDetails,
  onClick,
}: EquipmentCardProps) {
  const firstImageUrl = Array.isArray(equipment.image_urls)
    ? equipment.image_urls[0]
    : null;

  return (
    <Card
      className="group transition-all duration-200 hover:border-primary hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <EquipmentImage
        imageUrl={firstImageUrl}
        alt={equipment.name}
        size="thumbnail"
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 flex-1">
            {equipment.name}
          </h3>
          <div onClick={(e) => e.stopPropagation()}>
            <EquipmentActionsMenu
              equipment={equipment}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {equipment.category && (
            <EquipmentCategoryChip category={equipment.category} />
          )}
          <EquipmentStatusBadge
            status={equipment.status as "available" | "in-use" | "maintenance" | "retired" | null}
          />
        </div>
        {equipment.location && (
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <MapPin className="size-4" />
            <span>{equipment.location}</span>
          </div>
        )}
        {equipment.description && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {equipment.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

