import { useCallback, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePersistFn<T extends (...args: any[]) => any>(fn: T): T {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;
  return useCallback((...args: Parameters<T>) => fnRef.current(...args), []) as T;
}
