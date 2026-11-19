import { useSyncExternalStore } from "react";

const everySecond = (onChange: () => void) => {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
};

// the time now in whole seconds, ticking; 0 on the server and until the page has hydrated
export function useSeconds(): number {
  return useSyncExternalStore(
    everySecond,
    () => Math.floor(Date.now() / 1000),
    () => 0,
  );
}
