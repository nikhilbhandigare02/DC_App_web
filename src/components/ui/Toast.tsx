import { useEffect, useState } from 'react';
import { toast, type ToastMessage } from '../../lib/toast';
import { IconCheckCircle, IconClose, IconInfo, IconWarning } from '../icons';

// Vivid, saturated colors requested specifically for the toast popup — bolder
// than the muted `--color-error`/`--color-success` theme tokens used elsewhere
// (badges, banners), so kept as one-off values here rather than changed globally.
const VARIANT_CLASSES: Record<ToastMessage['variant'], string> = {
  success: 'border-[#1a9e3f] bg-[#1a9e3f] text-white',
  error: 'border-[#f0302b] bg-[#f0302b] text-white',
  info: 'border-info bg-info text-white',
};

const VARIANT_ICON: Record<ToastMessage['variant'], typeof IconInfo> = {
  success: IconCheckCircle,
  error: IconWarning,
  info: IconInfo,
};

/** Kept in sync with `.animate-toast-out` in `index.css`. */
const EXIT_ANIMATION_MS = 200;

type DisplayToast = ToastMessage & { exiting?: boolean };

/**
 * Global toast/snackbar host — mount once near the app root. Subscribes to
 * `src/lib/toast.ts`'s pub-sub bus. Small stacked top-right notification
 * cards, each tinted by variant (success/error/info), not a full-width
 * mobile snackbar bar.
 *
 * The bus itself removes a dismissed toast immediately, so this keeps its
 * own render-only copy a beat longer to play a fade/slide-out before the
 * card actually disappears.
 */
export function ToastContainer() {
  const [items, setItems] = useState<DisplayToast[]>([]);

  useEffect(
    () =>
      toast.subscribe((busItems) => {
        setItems((prev) => {
          const busIds = new Set(busItems.map((t) => t.id));
          const kept = prev.map((item) => {
            if (item.exiting || busIds.has(item.id)) return item;
            // Newly removed from the bus — mark exiting and schedule the actual removal.
            setTimeout(() => {
              setItems((cur) => cur.filter((c) => c.id !== item.id));
            }, EXIT_ANIMATION_MS);
            return { ...item, exiting: true };
          });
          const knownIds = new Set(kept.map((item) => item.id));
          const added = busItems.filter((item) => !knownIds.has(item.id));
          return [...kept, ...added];
        });
      }),
    [],
  );

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-full max-w-[360px] flex-col gap-2">
      {items.map((item) => {
        const VariantIcon = VARIANT_ICON[item.variant];
        return (
          <div
            key={item.id}
            role="status"
            className={`${item.exiting ? 'animate-toast-out' : 'animate-toast-in'} pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 shadow-lg ${VARIANT_CLASSES[item.variant]}`}
          >
            <VariantIcon size={17} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-[13px] font-medium leading-snug text-white">{item.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => toast.dismiss(item.id)}
              className="shrink-0 text-white/70 hover:text-white"
            >
              <IconClose size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
