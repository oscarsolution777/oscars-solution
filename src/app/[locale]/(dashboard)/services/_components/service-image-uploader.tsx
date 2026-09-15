"use client";

import { useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/validations/services";
import { ServiceThumbnail } from "./service-thumbnail";

export function ServiceImageUploader({
  fieldName,
  initialImageUrl,
  onFileChange,
}: {
  fieldName: string;
  initialImageUrl?: string | null;
  onFileChange: (file: File | null) => void;
}) {
  const t = useTranslations("services.form");
  const [preview, setPreview] = useState<string | null>(initialImageUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);

    if (!file) {
      onFileChange(null);
      return;
    }

    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError(t("imageInvalidType"));
      event.target.value = "";
      onFileChange(null);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(t("imageTooLarge"));
      event.target.value = "";
      onFileChange(null);
      return;
    }

    setPreview(URL.createObjectURL(file));
    onFileChange(file);
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldName}>{t("imageLabel")}</Label>
      <div className="flex items-center gap-3">
        {preview ? (
          // Preview local (blob:) o URL pública ya subida — next/image no
          // puede optimizar blob:, por eso aquí es un <img> plano.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="size-16 shrink-0 rounded-lg object-cover ring-1 ring-card-border"
          />
        ) : (
          <ServiceThumbnail imageUrl={null} name="" size={64} />
        )}
        <input
          id={fieldName}
          name={fieldName}
          type="file"
          accept={(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).join(",")}
          onChange={handleChange}
          className="block flex-1 text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-primary"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
