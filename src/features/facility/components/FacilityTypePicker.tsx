/**
 * "+ Add more" facility-type picker — ported from `FacilityTypePickerSheet`
 * in `lib/screens/facility/widgets/facility_sections.dart`: a searchable,
 * categorized (Medical/Non-Medical) checklist with tri-state category
 * checkboxes, sourced from `ddlApi.getFacilitiesMaster`. Migrated to the
 * shared `Modal` primitive rather than a one-off bottom-sheet overlay.
 */

import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import type { FacilityMasterCategory, FacilityMasterItem } from '../../../types/facility';

interface FacilityTypePickerProps {
  categories: FacilityMasterCategory[];
  alreadyAddedTypeCodes: Set<string>;
  onClose: () => void;
  onAdd: (items: FacilityMasterItem[]) => void;
}

export function FacilityTypePicker({ categories, alreadyAddedTypeCodes, onClose, onAdd }: FacilityTypePickerProps) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const availableCategories = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => !alreadyAddedTypeCodes.has(String(item.id))),
        }))
        .filter((category) => category.items.length > 0),
    [categories, alreadyAddedTypeCodes],
  );

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableCategories;
    return availableCategories
      .map((category) => ({ ...category, items: category.items.filter((item) => item.name.toLowerCase().includes(q)) }))
      .filter((category) => category.items.length > 0);
  }, [availableCategories, query]);

  function categoryState(category: FacilityMasterCategory): 'all' | 'some' | 'none' {
    const selectedCount = category.items.filter((item) => selectedIds.has(item.id)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === category.items.length) return 'all';
    return 'some';
  }

  function toggleCategory(category: FacilityMasterCategory) {
    const selectAll = categoryState(category) !== 'all';
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of category.items) {
        if (selectAll) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  function toggleItem(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const items = categories.flatMap((c) => c.items).filter((item) => selectedIds.has(item.id));
    onAdd(items);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Choose facility types"
      width={480}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={selectedIds.size === 0} className="flex-1">
            {selectedIds.size === 0 ? 'Select facility types' : `Add ${selectedIds.size} selected`}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-text-tertiary">Select one or more — a form opens for each.</p>

        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search facility..." />

        <div className="max-h-[50vh] overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-tertiary">No matching facility types.</p>
          ) : (
            filteredCategories.map((category, categoryIndex) => {
              const state = categoryState(category);
              const dotClass = categoryIndex % 2 === 0 ? 'bg-primary' : 'bg-accent';
              return (
                <div key={category.id} className="mb-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-surface-variant">
                    <input
                      type="checkbox"
                      checked={state === 'all'}
                      ref={(el) => {
                        if (el) el.indeterminate = state === 'some';
                      }}
                      onChange={() => toggleCategory(category)}
                      className="h-4 w-4 shrink-0 rounded border-divider text-primary accent-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
                    <span className="text-[13px] font-semibold text-text-primary">{category.name}</span>
                  </label>
                  <div className="ml-6 space-y-0.5 border-l border-divider pl-2">
                    {category.items.map((item) => (
                      <div key={item.id} className="rounded-md px-1 py-1 hover:bg-surface-variant">
                        <Checkbox
                          label={item.name}
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
