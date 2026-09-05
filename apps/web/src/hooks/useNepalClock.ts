import { useSyncExternalStore } from 'react';
import { nepalDateKey } from '../utils/nepalCalendar';

let now = Date.now();
let interval: ReturnType<typeof setInterval> | undefined;
const subscribers = new Set<() => void>();
function tick() { now = Date.now(); subscribers.forEach((notify) => notify()); }
function subscribe(notify: () => void) {
  subscribers.add(notify);
  if (subscribers.size === 1) {
    tick();
    interval = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
  }
  return () => {
    subscribers.delete(notify);
    if (!subscribers.size) {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    }
  };
}
export function useNepalClock(): Date {
  return new Date(useSyncExternalStore(subscribe, () => now, () => now));
}
/** Calendar consumers only rerender at the Nepal date boundary. */
export function useNepalToday(): string {
  return useSyncExternalStore(subscribe, () => nepalDateKey(new Date(now)), () => nepalDateKey(new Date(now)));
}
