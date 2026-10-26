import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const TABLET_QUERY = `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 0.02}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function subscribeTablet(onChange: () => void) {
  const mql = window.matchMedia(TABLET_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getTabletSnapshot() {
  return window.matchMedia(TABLET_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsTablet() {
  return React.useSyncExternalStore(
    subscribeTablet,
    getTabletSnapshot,
    getServerSnapshot,
  );
}
