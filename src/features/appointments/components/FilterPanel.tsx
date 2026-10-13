import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

interface FilterPanelProps {
  statusOptions: string[];
  visitTypeOptions: string[];
  testTypeOptions: string[];
  statusFilter: string | null;
  visitTypeFilter: string | null;
  testTypeFilter: string | null;
  onStatusChange: (value: string | null) => void;
  onVisitTypeChange: (value: string | null) => void;
  onTestTypeChange: (value: string | null) => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

/**
 * Status/Visit Type/Test Type filters, restyled as a compact
 * horizontal filter row (SaaS-admin convention) instead of the old
 * mobile filter-sheet card. Ported from `_FilterPanel`
 * (appointment_screen_web.dart).
 */
export function FilterPanel({
  statusOptions,
  visitTypeOptions,
  testTypeOptions,
  statusFilter,
  visitTypeFilter,
  testTypeFilter,
  onStatusChange,
  onVisitTypeChange,
  onTestTypeChange,
  hasActiveFilters,
  onClearAll,
}: FilterPanelProps) {
  return (
    <div className="rounded-lg border border-divider bg-surface p-3 transition-shadow duration-200 focus-within:border-appointment-accent/40 focus-within:shadow-[0_0_0_3px_rgba(108,92,231,0.12)]">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[160px]">
          <Select
            label="Status"
            value={statusFilter ?? ''}
            onChange={(e) => onStatusChange(e.target.value === '' ? null : e.target.value)}
            options={statusOptions.map((option) => ({ value: option, label: option }))}
            placeholder="All Statuses"
          />
        </div>

        <div className="w-[160px]">
          <Select
            label="Visit Type"
            value={visitTypeFilter ?? ''}
            onChange={(e) => onVisitTypeChange(e.target.value === '' ? null : e.target.value)}
            options={visitTypeOptions.map((option) => ({ value: option, label: option }))}
            placeholder="All Visit Types"
          />
        </div>

        <div className="w-[160px]">
          <Select
            label="Test Type"
            value={testTypeFilter ?? ''}
            onChange={(e) => onTestTypeChange(e.target.value === '' ? null : e.target.value)}
            options={testTypeOptions.map((option) => ({ value: option, label: option }))}
            placeholder="All Test Types"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="secondary" size="sm" onClick={onClearAll}>
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
