import type { RoomAmenityKey } from "@/lib/rooms";
import { RoomAmenityIcon } from "./rooms/RoomAmenityIcon";

interface AmenityItemProps {
  amenity: { key: RoomAmenityKey; label: string; description?: string };
  /** 'dark' for the dark home band, 'light' on a paper or white background. */
  tone?: "dark" | "light";
}

export function AmenityItem({ amenity, tone = "dark" }: AmenityItemProps) {
  return (
    <li className="flex items-center gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-ink">
        <RoomAmenityIcon name={amenity.key} className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold">{amenity.label}</p>
        {amenity.description && (
          <p
            className={`mt-1 text-small ${tone === "dark" ? "text-paper/80" : "text-muted"}`}
          >
            {amenity.description}
          </p>
        )}
      </div>
    </li>
  );
}
