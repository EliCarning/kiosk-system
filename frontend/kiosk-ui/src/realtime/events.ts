export const RealtimeEvents = {
  MachineUpdated: "kiosk:machine-updated",
  AlertCreated: "kiosk:alert-created",
  CommandUpdated: "kiosk:command-updated",
} as const;

export type RealtimeEventName =
  (typeof RealtimeEvents)[keyof typeof RealtimeEvents];

export function subscribeRealtime<T = unknown>(
  name: RealtimeEventName,
  handler: (payload: T) => void
): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<T>).detail;
    handler(detail);
  };
  window.addEventListener(name, listener as EventListener);
  return () => window.removeEventListener(name, listener as EventListener);
}

export function dispatchRealtime<T = unknown>(
  name: RealtimeEventName,
  payload: T
): void {
  window.dispatchEvent(new CustomEvent<T>(name, { detail: payload }));
}
