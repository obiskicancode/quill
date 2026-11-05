'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { MessageCircle, SlidersHorizontal } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import { Alert } from '@/components/ui/alert';
import { useAvailability } from '@/hooks/services/guest/use-availability';
import { todayISO } from '@/lib/dates';
import {
  countActiveFilters,
  emptyFilters,
  formatRange,
  hasFilters,
  matchesFilters,
  maxGuests,
  parseRoomQuery,
  serializeRoomQuery,
  sortOptions,
  sortRooms,
  stayProblem,
} from '@/lib/rooms';
import { whatsappHref } from '@/lib/site';
import { useSite } from '@/providers/site.provider';
import type {
  RoomFilters,
  RoomQuery,
  RoomType,
  StayParams,
} from '@/types/rooms.types';

import { HelpBlock } from '../HelpBlock';
import { AnimatedList } from '../motion/AnimatedList';
import { Reveal } from '../motion/Reveal';
import { EASE_OUT, springGentle } from '../motion/variants';
import { RoomCard } from '../RoomCard';
import { StayPicker } from '../stay/StayPicker';
import { Button, ButtonLink } from '../ui/button';
import { EmptyState } from './EmptyState';
import { FilterChips } from './FilterChips';
import { FilterPanel, FilterSheet } from './FilterPanel';
import { SkeletonCard } from './SkeletonCard';
import { SortMenu } from './SortMenu';

/** Owns the URL state (dates, guests, sort, filters) and renders the selector, toolbar, filters and room list. */
export function RoomsExplorer({ rooms }: { rooms: RoomType[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const site = useSite();
  const [, startTransition] = useTransition();
  const [openSignal, setOpenSignal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const reduced = useReducedMotion();

  const query = useMemo(() => parseRoomQuery(searchParams), [searchParams]);
  const notice =
    searchParams.get('notice') === 'checkout'
      ? 'Choose a room and your dates to start your booking.'
      : null;

  const intended = useRef(query);
  useEffect(() => {
    intended.current = query;
  }, [query]);

  const update = useCallback(
    (patch: Partial<RoomQuery>) => {
      const next = { ...intended.current, ...patch };
      intended.current = next;
      const qs = serializeRoomQuery(next);
      startTransition(() =>
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
      );
    },
    [pathname, router],
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

  // `count` caps how many rooms the page shows, so it goes last. Cutting the
  // catalogue before filtering makes a filtered URL report "no rooms match" for
  // rooms that are still there, with a Clear-all that cannot bring them back.
  // Availability and the filter bounds stay on the whole list so a refetch does
  // not re-key the query for every filter change.
  const shown = useMemo(
    () =>
      sortRooms(
        rooms.filter((r) => matchesFilters(r, query.filters)),
        query.sort,
      ),
    [rooms, query.filters, query.sort],
  );
  const visible = useMemo(
    () => (query.count ? shown.slice(0, query.count) : shown),
    [shown, query.count],
  );
  const { status, data, retry } = useAvailability(rooms, stay);

  const prices = rooms.filter((r) => r.showPrice).map((r) => r.basePriceNgn);
  const priceBounds = prices.length
    ? { min: Math.min(...prices), max: Math.max(...prices) }
    : null;
  const maxGuestsAvailable = Math.max(2, ...rooms.map(maxGuests));
  const activeFilters = countActiveFilters(query.filters);
  const sortLabel =
    sortOptions.find((o) => o.key === query.sort)?.label ?? 'Recommended';
  const loading = status === 'loading';
  // A new date range has no cached answer, so `data` is empty again on every
  // change. Nothing but the live slot depends on it, so the grid only earns
  // skeletons until the first answer lands; after that the cards stay put.
  const [settledOnce, setSettledOnce] = useState(false);
  if ((status === 'ready' || status === 'error') && !settledOnce) {
    setSettledOnce(true);
  }
  const firstLoad = loading && !settledOnce;

  const announcement = loading
    ? 'Checking availability for your dates.'
    : `${visible.length} ${visible.length === 1 ? 'room' : 'rooms'} shown. Sorted by ${sortLabel.toLowerCase()}.${status === 'error' ? ' Live availability could not be loaded.' : ''}`;

  const clearFilters = () => update({ filters: emptyFilters });

  const countFor = useCallback(
    (draft: RoomFilters) =>
      rooms.filter((r) => matchesFilters(r, draft)).length,
    [rooms],
  );

  return (
    <div>
      <StayPicker
        variant="rail"
        value={query}
        problem={problem}
        openSignal={openSignal}
        onChange={update}
      />
      {notice && (
        <div className="container-page pt-6">
          <Alert
            variant="brand"
            size="panel"
            role="status"
            className="font-medium"
          >
            {notice}
          </Alert>
        </div>
      )}

      <div className="container-page pt-8 pb-4 md:pt-10">
        <div className="rooms-sidebar">
          <aside aria-label="Filters" className="hidden lg:block">
            <div className="sticky-under-header pr-1">
              <h2 className="mb-4 font-display text-h3">Filters</h2>
              <FilterPanel
                value={query.filters}
                onChange={(filters) => update({ filters })}
                priceBounds={priceBounds}
                maxGuestsAvailable={maxGuestsAvailable}
                countFor={countFor}
              />
            </div>
          </aside>

          <div>
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <p className="font-semibold">
                  {visible.length} {visible.length === 1 ? 'room' : 'rooms'}
                  {stay && (
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      for {formatRange(stay.checkIn, stay.checkOut)}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    className="lg:hidden"
                    icon={<SlidersHorizontal className="size-4" aria-hidden />}
                    onClick={() => setFiltersOpen(true)}
                  >
                    Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
                  </Button>
                  <SortMenu
                    value={query.sort}
                    onChange={(sort) => update({ sort })}
                  />
                </div>
              </div>
            </Reveal>
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

            {status === 'error' && (
              <Alert
                variant="destructive"
                size="panel"
                role="alert"
                className="mt-6 gap-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <p>
                  <span className="font-semibold">
                    We couldn&rsquo;t load availability.
                  </span>{' '}
                  Rooms are shown with starting rates only.
                </p>
                <Button variant="secondary" size="sm" onClick={retry}>
                  Retry
                </Button>
              </Alert>
            )}

            <div className="mt-6" aria-busy={loading}>
              {rooms.length === 0 ? (
                <Reveal>
                  <EmptyState
                    title="Our rooms are being updated"
                    text="Message us on WhatsApp and we will tell you what is available for your dates."
                    action={
                      <ButtonLink
                        href={whatsappHref(
                          site,
                          `Hello ${site.name}, which rooms are available for my dates?`,
                        )}
                        external
                        variant="whatsapp"
                        icon={<MessageCircle className="size-5" aria-hidden />}
                      >
                        Chat on WhatsApp
                      </ButtonLink>
                    }
                  />
                </Reveal>
              ) : visible.length === 0 ? (
                <Reveal>
                  <EmptyState
                    title="No rooms match these filters"
                    text="Try a wider price range or remove a filter to see more rooms."
                    action={
                      <Button onClick={clearFilters}>Clear all filters</Button>
                    }
                  />
                </Reveal>
              ) : (
                <AnimatedList className="grid gap-6 lg:grid-cols-2">
                  {visible.map((room, index) => (
                    <motion.li
                      key={room.id}
                      layout={reduced ? false : 'position'}
                      initial={reduced ? false : { opacity: 0, scale: 0.98 }}
                      animate={reduced ? undefined : { opacity: 1, scale: 1 }}
                      exit={reduced ? undefined : { opacity: 0, scale: 0.98 }}
                      transition={{
                        duration: 0.35,
                        ease: EASE_OUT,
                        layout: springGentle,
                      }}
                      className="h-full"
                    >
                      {firstLoad ? (
                        <SkeletonCard />
                      ) : (
                        <RoomCard
                          variant="listing"
                          room={room}
                          index={index}
                          query={query}
                          liveState={status}
                          availability={data?.[room.id] ?? null}
                          onCheckAvailability={() =>
                            setOpenSignal((n) => n + 1)
                          }
                          onRetryPrice={retry}
                          onPickDates={(range) => update(range)}
                        />
                      )}
                    </motion.li>
                  ))}
                  {!firstLoad && visible.length > 0 && (
                    <motion.li
                      key="help"
                      layout={reduced ? false : 'position'}
                      // Single column below lg, so the help card has a row to
                      // itself there; on lg it only fills an odd final slot.
                      className={
                        visible.length % 2 === 1 ? 'h-full' : 'h-full lg:hidden'
                      }
                    >
                      <HelpBlock variant="compact" />
                    </motion.li>
                  )}
                </AnimatedList>
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
        countFor={countFor}
        priceBounds={priceBounds}
        maxGuestsAvailable={maxGuestsAvailable}
      />
    </div>
  );
}
