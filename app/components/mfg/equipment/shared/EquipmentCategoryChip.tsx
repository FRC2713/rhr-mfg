import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface EquipmentCategoryChipProps {
  category: string | null | undefined;
  className?: string;
}

export function EquipmentCategoryChip({
  category,
  className,
}: EquipmentCategoryChipProps) {
  if (!category) {
    return null;
  }

  return (
    <Badge
      variant="secondary"
      className={cn("font-normal", className)}
    >
      {category}
    </Badge>
  );
}

