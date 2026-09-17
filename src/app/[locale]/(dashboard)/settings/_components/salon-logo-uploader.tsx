"use client";

import { useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { ALLOWED_LOGO_MIME_TYPES, MAX_LOGO_SIZE_BYTES } from "@/lib/validations/salons";

// Calco de ServiceImageUploader (services/_components/service-image-uploader.tsx)
// adaptado al logo del salón: mismo patrón de preview local + validación de
// tipo/tamaño en el cliente (la validación real está en la Server Action).
export function SalonLogoUploader({
  initialLogoUrl,
  onFileChange,
}: {
  initialLogoUrl: string | null;
  onFileChange: (file: File | null) => void;
}) {
  const t = useTranslations("settings.profile");
  const [preview, setPreview] = useState<string | null>(initialLogoUrl);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);

    if (!file) {
      onFileChange(null);
      return;
    }

    if (!(ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError(t("logoInvalidType"));
      event.target.value = "";
      onFileChange(null);
      return;
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setError(t("logoTooLarge"));
      event.target.value = "";
      onFileChange(null);
      return;
    }

    setPreview(URL.createObjectURL(file));
    onFileChange(file);
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor="logo">{t("logoLabel")}</Label>
      <div className="flex items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="size-16 shrink-0 rounded-full object-cover ring-1 ring-card-border"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-text-secondary">
            {t("logoEmpty")}
          </div>
        )}
        <input
          id="logo"
          name="logo"
          type="file"
          accept={(ALLOWED_LOGO_MIME_TYPES as readonly string[]).join(",")}
          onChange={handleChange}
          className="block flex-1 text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-primary"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
