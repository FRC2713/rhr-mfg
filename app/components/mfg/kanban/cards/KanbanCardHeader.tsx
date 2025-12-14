import { GripVertical } from "lucide-react";

interface KanbanCardHeaderProps {
  title: string;
  attributes: React.HTMLAttributes<HTMLDivElement>;
  listeners?: Record<string, Function>;
}

export function KanbanCardHeader({
  title,
  attributes,
  listeners,
}: KanbanCardHeaderProps) {
  return (
    <div
      {...attributes}
      {...listeners}
      className="justiy-start bg-secondary/50 flex w-full cursor-grab items-center gap-2 p-2.5 pb-2"
    >
      {/* Drag Handle - Always visible on touch devices, hover-only on desktop */}
      <button
        className="mt-0.5 touch-none opacity-60 transition-opacity group-hover:opacity-100 hover:opacity-100 active:cursor-grabbing active:opacity-100"
        aria-label="Drag to reorder"
      >
        <GripVertical className="text-muted-foreground size-4" />
      </button>

      {/* Title */}
      <h3 className="line-clamp-2 flex-1 text-xs leading-tight font-semibold hover:underline sm:text-sm">
        {title}
      </h3>
    </div>
  );
}
