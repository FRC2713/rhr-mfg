import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import type { EquipmentStatus } from "./EquipmentStatusBadge";

export interface EquipmentFormData {
  name: string;
  description: string;
  category: string;
  location: string;
  status: EquipmentStatus | "";
  documentationUrl: string;
}

export interface EquipmentFormErrors {
  name?: string;
  description?: string;
  category?: string;
  location?: string;
  status?: string;
  documentationUrl?: string;
}

interface EquipmentFormFieldsProps {
  formData: EquipmentFormData;
  onChange: (field: keyof EquipmentFormData, value: string) => void;
  errors?: EquipmentFormErrors;
}

const statusOptions: { value: EquipmentStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "in-use", label: "In Use" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retired" },
];

const categoryOptions = [
  "CNC",
  "3D Printer",
  "Hand Tools",
  "Measuring",
  "Power Tools",
  "Safety Equipment",
  "Fasteners",
  "Materials",
  "Other",
];

export function EquipmentFormFields({
  formData,
  onChange,
  errors = {},
}: EquipmentFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="e.g., Drill Press"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Equipment description and notes..."
          rows={3}
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p className="text-destructive text-sm">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category || undefined}
            onValueChange={(value) => onChange("category", value)}
          >
            <SelectTrigger id="category" aria-invalid={!!errors.category}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-destructive text-sm">{errors.category}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status || undefined}
            onValueChange={(value) =>
              onChange("status", value as EquipmentStatus)
            }
          >
            <SelectTrigger id="status" aria-invalid={!!errors.status}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-destructive text-sm">{errors.status}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => onChange("location", e.target.value)}
          placeholder="e.g., Shop A, Toolbox 1"
          aria-invalid={!!errors.location}
        />
        {errors.location && (
          <p className="text-destructive text-sm">{errors.location}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="documentationUrl">Documentation URL</Label>
        <Input
          id="documentationUrl"
          type="url"
          value={formData.documentationUrl}
          onChange={(e) => onChange("documentationUrl", e.target.value)}
          placeholder="https://example.com/manual.pdf"
          aria-invalid={!!errors.documentationUrl}
        />
        {errors.documentationUrl && (
          <p className="text-destructive text-sm">{errors.documentationUrl}</p>
        )}
      </div>
    </div>
  );
}
