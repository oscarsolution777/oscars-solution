import Image from "next/image";
import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

export function ServiceThumbnail({
  imageUrl,
  name,
  size = 40,
  className,
}: {
  imageUrl: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (!imageUrl) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-muted text-text-muted",
          className
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <Scissors size={size * 0.45} />
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={name}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-lg object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
