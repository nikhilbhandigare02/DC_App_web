import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * "+ Add {label}" pill that opens a small checklist popover — the trigger
 * for picking which ID Proof / Client Photo types show a row in the table
 * below. Closes on an outside click, same pattern as `HomeLayout`'s avatar
 * menu.
 *
 * The panel is portaled to `document.body` and positioned with `fixed`
 * coordinates measured from the button — `Card` (its natural parent here)
 * sets `overflow-hidden` for its rounded corners, which would otherwise clip
 * the panel wherever it crosses the card's edge into the next section.
 *
 * [locked] options (types that already have an uploaded document) stay
 * checked and can't be unticked.
 */
export function AddTypeMenu({
  label,
  options,
  selected,
  onToggle,
  locked,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (option: string, checked: boolean) => void;
  locked?: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    // Capture-phase scroll listener: closes the panel instead of leaving it
    // misaligned with the button once anything under it scrolls, since a
    // `fixed`-positioned panel doesn't move along with page content.
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-accent/40 px-3 py-1.5 text-[12.5px] font-semibold text-accent-dark transition-colors hover:bg-accent-pale/40"
      >
        + Add {label}
      </button>
      {open && position
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: position.top, right: position.right }}
              className="fixed z-[200] max-h-64 w-56 overflow-y-auto rounded-lg border border-divider bg-surface p-1.5 shadow-lg"
            >
              {options.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-text-tertiary">No options available.</p>
              ) : (
                options.map((option) => {
                  const isLocked = locked?.has(option) ?? false;
                  return (
                    <label
                      key={option}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                        isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-surface-variant'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(option)}
                        disabled={isLocked}
                        onChange={(e) => onToggle(option, e.target.checked)}
                        className="h-3.5 w-3.5 shrink-0 rounded border-divider text-primary accent-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="text-[13px] text-text-primary">{option}</span>
                    </label>
                  );
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
