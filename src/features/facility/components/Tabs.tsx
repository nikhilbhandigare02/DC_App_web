/**
 * Small local underline-style tab bar — the shared UI kit doesn't have a
 * `Tabs` primitive yet, so this lives in-feature (per the redesign brief)
 * rather than adding one to `src/components/ui`. Matches the SaaS-admin
 * visual language: flat underline indicator, no pill/segmented-control
 * background.
 */

export interface TabItem {
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
}

export function Tabs({ items, activeIndex, onChange, className }: TabsProps) {
  return (
    <div className={`flex items-center gap-1 border-b border-divider ${className ?? ''}`} role="tablist">
      {items.map((item, index) => {
        const active = index === activeIndex;
        return (
          <button
            key={item.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(index)}
            className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold transition-colors duration-200 ${
              active ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {item.label}
            {item.count != null ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                  active
                    ? 'bg-gradient-to-r from-primary-pale to-accent-pale text-primary-dark shadow-sm shadow-accent/20'
                    : 'bg-surface-variant text-text-tertiary'
                }`}
              >
                {item.count}
              </span>
            ) : null}
            <span
              className={`absolute inset-x-0 -bottom-px h-[2.5px] rounded-full transition-all duration-200 ${
                active ? 'bg-gradient-to-r from-accent via-primary to-accent shadow-[0_0_6px] shadow-accent/60' : 'bg-transparent'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
