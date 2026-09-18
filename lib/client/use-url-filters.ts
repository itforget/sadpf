'use client';

import { useSyncExternalStore } from 'react';

const FILTER_EVENT = 'sadpf:filters';

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener(FILTER_EVENT, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(FILTER_EVENT, callback);
  };
}

function getSnapshot() {
  return window.location.search;
}

function getServerSnapshot() {
  return '';
}

// Native history updates preserve the current page and integrate with the Next router.
export function useUrlFilters() {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const params = new URLSearchParams(search);

  const updateFilters = (values: Record<string, string | null>, push = false) => {
    const url = new URL(window.location.href);
    for (const [name, value] of Object.entries(values)) {
      if (value) url.searchParams.set(name, value);
      else url.searchParams.delete(name);
    }
    if (push) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event(FILTER_EVENT));
  };

  return { params, updateFilters };
}
