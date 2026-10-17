"use client";

import type { StayParams } from "@/lib/availability";
import { todayISO } from "@/lib/dates";
import {
  formatRange,
  hasFilters,
  parseRoomQuery,
  serializeRoomQuery,
  stayProblem,
  type RoomQuery,
} from "@/lib/room-query";
import {
  countActiveFilters,
  emptyFilters,
  matchesFilters,
  maxGuests,
  sortOptions,
  sortRooms,
  type RoomType,
} from "@/lib/rooms";
import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { HelpBlock } from "../HelpBlock";
import { RoomCard } from "../RoomCard";
import { Button } from "../ui/Button";
import { EmptyState } from "./EmptyState";
import { FilterChips } from "./FilterChips";
import { FilterPanel, FilterSheet } from "./FilterPanel";
import { PreviewBar } from "./PreviewBar";
import { SkeletonCard } from "./SkeletonCard";
import { SortMenu } from "./SortMenu";
import { StaySelector } from "./StaySelector";
import { useAvailability } from "./useAvailability";

/** Owns the URL state (dates, guests, sort, filters) and renders the selector, toolbar, filters and room list. */
export function RoomsExplorer({ rooms }: { rooms: RoomType[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [openSignal, setOpenSignal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = useMemo(() => parseRoomQuery(searchParams), [searchParams]);
  const notice =
    searchParams.get("notice") === "checkout"
      ? "Choose a room and your dates to start your booking."
      : null;

  const update = useCallback(
    (patch: Partial<RoomQuery>) => {
      const qs = serializeRoomQuery({ ...query, ...patch });
      startTransition(() =>
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
      );
    },
    [query, pathname, router],
  );

  const problem = stayProblem(query, todayISO());
  const stay = useMemo<StayParams | null>(
    () =>
      !problem && query.checkIn && query.checkOut
        ? {
            checkIn: query.checkIn,
            checkOut: query.checkOut,
            adults: query.adults,
            children: query.children,
          }
        : null,
    [problem, query.checkIn, query.checkOut, query.adults, query.children],
  );

  const base = useMemo(
    () => (query.count ? rooms.slice(0, query.count) : rooms),
    [rooms, query.count],
  );
  const visible = useMemo(
    () =>
      sortRooms(
        base.filter((r) => matchesFilters(r, query.filters)),
        query.sort,
      ),
    [base, query.filters, query.sort],
  );
  const { status, data, retry } = useAvailability(base, stay, query.demo);

  const prices = base.filter((r) => r.showPrice).map((r) => r.basePriceNgn);
  const priceBounds = prices.length
    ? { min: Math.min(...prices), max: Math.max(...prices) }
    : null;
  const maxGuestsAvailable = Math.max(2, ...base.map(maxGuests));
  const activeFilters = countActiveFilters(query.filters);
  const sortLabel =
    sortOptions.find((o) => o.key === query.sort)?.label ?? "Recommended";
  const loading = status === "loading";

  const announcement = loading
    ? "Checking availability for your dates."
    : `${visible.length} ${visible.length === 1 ? "room" : "rooms"} shown. Sorted by ${sortLabel.toLowerCase()}.${status === "error" ? " Live availability could not be loaded." : ""}`;

  const clearFilters = () => update({ filters: emptyFilters });

  return (
    <div>
      <PreviewBar query={query} onChange={update} />
      <StaySelector
        query={query}
        problem={problem}
        onChange={update}
        openSignal={openSignal}
      />
      {notice && (
        <div className="container-page pt-6">
          <p
            role="status"
            className="rounded-card border border-accent bg-accent/15 p-4 text-small font-medium"
          >
            {notice}
          </p>
        </div>
      )}

      <div className="container-page pb-4 pt-8 md:pt-10">
        <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 xl:gap-12">
          <aside aria-label="Filters" className="hidden lg:block">
            <div className="sticky top-40 max-h-[calc(100dvh-11rem)] overflow-y-auto pr-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-h3">Filters</h2>
                {activeFilters > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex min-h-11 items-center text-small font-semibold underline decoration-accent decoration-2 underline-offset-4"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <FilterPanel
                value={query.filters}
                onChange={(filters) => update({ filters })}
                priceBounds={priceBounds}
                maxGuestsAvailable={maxGuestsAvailable}
              />
            </div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <p className="font-semibold">
                {visible.length} {visible.length === 1 ? "room" : "rooms"}
                {stay && (
                  <span className="font-normal text-muted">
                    {" "}
                    for {formatRange(stay.checkIn, stay.checkOut)}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="lg:hidden"
                  icon={<SlidersHorizontal className="size-4" aria-hidden />}
                  onClick={() => setFiltersOpen(true)}
                >
                  Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
                </Button>
                <SortMenu
                  value={query.sort}
                  onChange={(sort) => update({ sort })}
                />
              </div>
            </div>
            <p role="status" aria-live="polite" className="sr-only">
              {announcement}
            </p>

            {hasFilters(query) && (
              <div className="mt-4">
                <FilterChips
                  filters={query.filters}
                  onChange={(filters) => update({ filters })}
                  onClearAll={clearFilters}
                />
              </div>
            )}

            {status === "error" && (
              <div
                role="alert"
                className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-card border border-danger/40 bg-surface p-4"
              >
                <p className="text-small">
                  <span className="font-semibold">
                    We couldn&rsquo;t load availability.
                  </span>{" "}
                  Rooms are shown with starting rates only.
                </p>
                <Button variant="secondary" size="sm" onClick={retry}>
                  Retry
                </Button>
              </div>
            )}

            <div className="mt-6" aria-busy={loading}>
              {base.length === 0 ? (
                <EmptyState
                  title="Our rooms are being updated"
                  text="Message us on WhatsApp and we will tell you what is available for your dates."
                  action={<HelpBlock variant="compact" />}
                />
              ) : visible.length === 0 ? (
                <EmptyState
                  title="No rooms match these filters"
                  text="Try a wider price range or remove a filter to see more rooms."
                  action={<Button onClick={clearFilters}>Clear filters</Button>}
                />
              ) : (
                <ul className="grid gap-6 lg:grid-cols-2">
                  {visible.map((room, index) => (
                    <li key={room.id}>
                      {loading ? (
                        <SkeletonCard />
                      ) : (
                        <RoomCard
                          variant="listing"
                          room={room}
                          index={index}
                          query={query}
                          liveState={
                            status === "ready"
                              ? "ready"
                              : status === "error"
                                ? "error"
                                : "idle"
                          }
                          availability={data?.[room.id] ?? null}
                          onCheckAvailability={() =>
                            setOpenSignal((n) => n + 1)
                          }
                          onPickDates={(range) => update(range)}
                        />
                      )}
                    </li>
                  ))}
                  {!loading && visible.length % 2 === 1 && (
                    <li className="hidden lg:block">
                      <HelpBlock variant="compact" />
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={query.filters}
        onApply={(filters) => update({ filters })}
        countFor={(draft) =>
          base.filter((r) => matchesFilters(r, draft)).length
        }
        priceBounds={priceBounds}
        maxGuestsAvailable={maxGuestsAvailable}
      />
    </div>
  );
}
