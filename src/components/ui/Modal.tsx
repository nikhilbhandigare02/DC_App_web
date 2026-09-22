import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { IconClose } from '../icons';

/** How long the exit animation runs before the modal actually unmounts. Keep in sync with `.animate-modal-out` / `.animate-backdrop-out` in `index.css`. */
const CLOSE_ANIMATION_MS = 160;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Max width in px. Defaults to 480. */
  width?: number;
}

/**
 * Centered dialog primitive for non-form content — confirmations, read-only
 * detail views (`AppointmentDetailModal`), and pickers (`FacilityTypePicker`).
 * Forms belong in the side `Drawer` instead (see `AddDoctorForm`,
 * `FacilityEntryCard`), never in this centered dialog.
 */
export function Modal({ open, onClose, title, children, footer, width = 480 }: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const timeout = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timeout);
    // `mounted` intentionally excluded — this effect should only react to `open` changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  // Portaled to `document.body` — a page wrapper further up the tree (`.animate-page-in`)
  // keeps a non-`none` `transform` at rest, which would otherwise become the containing
  // block for this `fixed` overlay and clip it to that wrapper's height instead of the
  // full viewport.
  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 ${
        closing ? 'animate-backdrop-out' : 'animate-backdrop-in'
      }`}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[85vh] w-full flex-col overflow-hidden rounded-lg border border-divider bg-surface shadow-xl ${
          closing ? 'animate-modal-out' : 'animate-modal-in'
        }`}
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="flex shrink-0 items-center justify-between border-b border-divider bg-gradient-to-r from-primary-pale/50 via-transparent to-transparent px-5 py-3.5">
            <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-variant hover:text-text-primary"
            >
              <IconClose size={16} />
            </button>
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-divider px-5 py-3.5">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
