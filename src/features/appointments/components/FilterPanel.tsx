import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

interface FilterPanelProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
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

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/**
 * Search + Status/Visit Type/Test Type filters, restyled as a compact
 * horizontal filter row (SaaS-admin convention) instead of the old
 * mobile filter-sheet card. Ported from `_FilterPanel`
 * (appointment_screen_web.dart).
 */
export function FilterPanel({
  searchValue,
  onSearchChange,
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
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search"
            placeholder="Patient name or proposal no..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            icon={<SearchIcon />}
          />
        </div>

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
