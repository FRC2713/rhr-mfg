"use client";

import { useState } from "react";
import { ImageUploadZone } from "./shared/ImageUploadZone";
import { ImagePreview } from "./shared/ImagePreview";
import { EquipmentImageLightbox } from "./EquipmentImageLightbox";

interface EquipmentImageGalleryProps {
  images: string[];
  onUpload: (files: File[]) => Promise<void>;
  onDeleteImage?: (imageUrl: string) => Promise<void>;
  equipmentId: string;
  maxImages?: number;
  disabled?: boolean;
}

export function EquipmentImageGallery({
  images,
  onUpload,
  onDeleteImage,
  equipmentId,
  maxImages = 10,
  disabled = false,
}: EquipmentImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((imageUrl, index) => (
              <ImagePreview
                key={imageUrl}
                imageUrl={imageUrl}
                onClick={() => handleImageClick(index)}
                onDelete={
                  onDeleteImage ? () => onDeleteImage(imageUrl) : undefined
                }
                showDelete={!!onDeleteImage}
              />
            ))}
          </div>
        )}
        <ImageUploadZone
          onUpload={onUpload}
          existingImages={images}
          onDeleteImage={onDeleteImage}
          maxImages={maxImages}
          disabled={disabled}
        />
      </div>
      <EquipmentImageLightbox
        images={images}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

