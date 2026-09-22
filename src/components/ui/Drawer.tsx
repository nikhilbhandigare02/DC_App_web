import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { IconClose } from '../icons';

/** Kept in sync with `.animate-drawer-out-*` / `.animate-backdrop-out` in `index.css`. */
const CLOSE_ANIMATION_MS = 180;

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Which edge the drawer slides in from. Defaults to `right`. */
  side?: 'left' | 'right';
  /** Width in px. Defaults to 400. */
  width?: number;
}

/** Side-panel overlay primitive — same scroll-lock/escape behavior as `Modal`, for content too tall/wide for a centered dialog. */
export function Drawer({ open, onClose, title, children, footer, side = 'right', width = 400 }: DrawerProps) {
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

  const slideInClass = side === 'right' ? 'animate-drawer-in-right' : 'animate-drawer-in-left';
  const slideOutClass = side === 'right' ? 'animate-drawer-out-right' : 'animate-drawer-out-left';

  // Portaled to `document.body` — a page wrapper further up the tree (`.animate-page-in`)
  // keeps a non-`none` `transform` at rest, which would otherwise become the containing
  // block for this `fixed` overlay and clip it to that wrapper's height instead of the
  // full viewport.
  return createPortal(
    <div
      className={`fixed inset-0 z-[100] bg-black/40 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute inset-y-0 flex h-full flex-col border-divider bg-surface shadow-xl ${
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r'
        } ${closing ? slideOutClass : slideInClass}`}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-divider bg-gradient-to-r from-primary-pale/50 via-transparent to-transparent px-5 py-3.5">
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
        {footer ? <div className="flex items-center justify-end gap-2 border-t border-divider px-5 py-3.5">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
