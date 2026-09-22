/**
 * Minimal pub-sub toast/notification bus, standing in for the Dart app's
 * `AppSnackbar.showSuccess`/`showError` (see `lib/widgets/app_snackbar.dart`).
 * `ToastContainer` (in `src/components/ui/Toast.tsx`) subscribes and renders.
 */

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  variant: ToastVariant;
  message: string;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const DEFAULT_DURATION_MS = 4000;

function emit(): void {
  for (const listener of listeners) listener(toasts);
}

function dismiss(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(variant: ToastVariant, message: string, durationMs = DEFAULT_DURATION_MS): void {
  const id = nextId++;
  toasts = [...toasts, { id, variant, message }];
  emit();
  if (durationMs > 0) {
    setTimeout(() => dismiss(id), durationMs);
  }
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
  dismiss,
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(toasts);
    return () => listeners.delete(listener);
  },
};
