import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

export interface UploadReportFilters {
  fromDate: string;
  toDate: string;
  insuranceId: string;
  caseId: string;
  appointmentId: string;
}

interface FilterBarProps {
  filters: UploadReportFilters;
  insuranceOptions: string[];
  onChange: (filters: UploadReportFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

/**
 * Filter bar for the report-upload worklist: date range, insurance,
 * case/appointment id, assignee, branch — ported from `_ReportFilterSheet`
 * (upload_report_screen.dart), restyled as a compact horizontal filter row
 * (SaaS-admin convention) using the shared `Input`/`Select` kit instead of
 * the old mobile filter-sheet card.
 *
 * There's no dedicated insurance DDL endpoint in this catalogue, so Insurance
 * is a free select derived from the loaded page's results (same pattern the
 * Dart screen uses for its local Status filter). Assignee/Branch filters were
 * removed from the UI — `GetReportUploadList` still accepts `assignedTo`/
 * `branchId`, but the page no longer sends them.
 */
export function FilterBar({ filters, insuranceOptions, onChange, onApply, onClear }: FilterBarProps) {
  function set<K extends keyof UploadReportFilters>(key: K, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="rounded-lg border border-divider bg-surface p-3 transition-shadow duration-200 focus-within:border-accent/40 focus-within:shadow-[0_0_0_3px_rgba(14,165,174,0.12)]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Input label="From Date" type="date" value={filters.fromDate} onChange={(e) => set('fromDate', e.target.value)} />
        <Input label="To Date" type="date" value={filters.toDate} onChange={(e) => set('toDate', e.target.value)} />
        <Select
          label="Insurance"
          value={filters.insuranceId}
          onChange={(e) => set('insuranceId', e.target.value)}
          options={insuranceOptions.map((name) => ({ value: name, label: name }))}
          placeholder="All Insurers"
        />
        <Input
          label="Case ID"
          type="text"
          inputMode="numeric"
          placeholder="Case ID"
          value={filters.caseId}
          onChange={(e) => set('caseId', e.target.value)}
        />
        <Input
          label="Appointment ID"
          type="text"
          inputMode="numeric"
          placeholder="Appointment ID"
          value={filters.appointmentId}
          onChange={(e) => set('appointmentId', e.target.value)}
        />
      </div>
      <div className="mt-3 flex justify-end gap-2.5">
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear
        </Button>
        <Button variant="primary" size="sm" onClick={onApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}
