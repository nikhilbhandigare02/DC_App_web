import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReportUploadList } from '../../api/reportUploadApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table, type TableColumn } from '../../components/ui/Table';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { IconFileUp, IconWarning } from '../../components/icons';
import { toast } from '../../lib/toast';
import type { AppointmentUIModel } from '../appointments/types';
import { formatDate } from '../appointments/types';
import { FilterBar, type UploadReportFilters } from './components/FilterBar';
import { PaginationBar } from './components/PaginationBar';
import { caseCode, mapReportUploadItemsToModels } from './mapping';

const PAGE_SIZE = 10;

const EMPTY_FILTERS: UploadReportFilters = {
  fromDate: '',
  toDate: '',
  insuranceId: '',
  caseId: '',
  appointmentId: '',
};

function toNumberOrUndefined(value: string): number | undefined {
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : undefined;
}

/** `yyyy-MM-dd` (native `<input type="date">`) -> `dd-MM-yyyy` (what `GetReportUploadList` expects). */
function toApiDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}-${month}-${year}`;
}

function reportStatusTone(status: string): BadgeTone {
  switch (status) {
    case 'Needs Correction':
      return 'error';
    case 'Report Done':
      return 'success';
    default:
      return 'warning';
  }
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
 * Report-upload worklist — every case needing a document uploaded,
 * re-uploaded after a correction, or already done. Ported from
 * `UploadReportScreen` (upload_report_screen.dart), restyled around a
 * sortable data table with a compact filter row instead of the old
 * two-column card grid.
 */
export function UploadReportPage() {
  const navigate = useNavigate();

  const [cases, setCases] = useState<AppointmentUIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<UploadReportFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<UploadReportFilters>(EMPTY_FILTERS);

  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  async function loadCases(page: number, filters: UploadReportFilters) {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await getReportUploadList({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        insuranceId: undefined, // insuranceId is resolved client-side below (see FilterBar's note) — no name->id DDL exists.
        caseId: toNumberOrUndefined(filters.caseId),
        appointmentId: toNumberOrUndefined(filters.appointmentId),
        fromDate: toApiDate(filters.fromDate),
        toDate: toApiDate(filters.toDate),
      });
      setCurrentPage(page);
      setTotalRecords(response.totalRecords ?? 0);
      setCases(mapReportUploadItemsToModels(response.data ?? []));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load the report upload list. Please try again.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCases(1, EMPTY_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    void loadCases(page, appliedFilters);
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
    void loadCases(1, draftFilters);
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    void loadCases(1, EMPTY_FILTERS);
  }

  const insuranceOptions = useMemo(
    () => Array.from(new Set(cases.map((c) => c.insuranceCompany).filter(Boolean))),
    [cases],
  );

  const filteredCases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const insuranceFilter = draftFilters.insuranceId;
    return cases.filter((c) => {
      const matchesSearch =
        query === '' || c.patientName.toLowerCase().includes(query) || caseCode(c).toLowerCase().includes(query);
      const matchesInsurance = insuranceFilter === '' || c.insuranceCompany === insuranceFilter;
      return matchesSearch && matchesInsurance;
    });
  }, [cases, searchQuery, draftFilters.insuranceId]);

  const needsCorrectionCount = filteredCases.filter((c) => c.reportStatus === 'Needs Correction').length;

  function openCase(item: AppointmentUIModel) {
    // `appointmentId` is optional on this endpoint — an empty segment here would build a
    // path like `/home/appointments//client-info`, which doesn't match the `:appointmentId`
    // route and silently bounces to the home screen via the catch-all redirect.
    if (!item.appointmentId) {
      toast.error('This case has no linked appointment yet, so it can’t be opened.');
      return;
    }
    navigate(`/home/appointments/${encodeURIComponent(item.appointmentId)}/client-info?caseId=${encodeURIComponent(item.caseId)}`);
  }

  const columns: TableColumn<AppointmentUIModel>[] = [
    {
      key: 'caseId',
      header: 'Case ID',
      sortable: true,
      sortValue: (row) => caseCode(row),
      render: (row) => <span className="font-mono text-[12.5px] font-medium text-text-primary">{caseCode(row)}</span>,
    },
    {
      key: 'patientName',
      header: 'Client',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-pale text-[11px] font-semibold text-primary">
            {row.patientName.trim() ? row.patientName.trim()[0].toUpperCase() : '?'}
          </span>
          <span className="truncate text-[13px] font-medium text-text-primary">{row.patientName || '—'}</span>
        </div>
      ),
    },
    { key: 'insuranceCompany', header: 'Insurance', sortable: true, render: (row) => row.insuranceCompany || '—' },
    {
      key: 'registeredDate',
      header: 'Registered',
      sortable: true,
      render: (row) => <span className="whitespace-nowrap">{row.registeredDate || '—'}</span>,
    },
    {
      key: 'date',
      header: 'Appointment Date',
      sortable: true,
      sortValue: (row) => row.date.getTime(),
      render: (row) => <span className="whitespace-nowrap">{formatDate(row.date, 'dd-MM-yyyy')}</span>,
    },
    { key: 'dcName', header: 'Branch', render: (row) => row.dcName || '—' },
    {
      key: 'reportStatus',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge tone={reportStatusTone(row.reportStatus)}>{row.reportStatus}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '90px',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => openCase(row)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Report Upload"
        description="Cases waiting on a document upload or re-upload."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-pale py-1 pl-1 pr-3 text-[12.5px] font-semibold text-accent-dark shadow-[0_1px_2px_rgba(14,165,174,0.12)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-accent-light to-accent text-white shadow-[0_2px_6px_-1px_rgba(14,165,174,0.55)]">
              <IconFileUp size={11} />
            </span>
            {filteredCases.length} case(s)
          </span>
        }
      />

      <div className="max-w-md">
        <Input
          placeholder="Search by patient name or case ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<SearchIcon />}
        />
      </div>

      <FilterBar
        filters={draftFilters}
        insuranceOptions={insuranceOptions}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onClear={clearFilters}
      />

      {needsCorrectionCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-md border border-error/30 bg-gradient-to-r from-error-pale to-error-pale/40 px-3.5 py-2.5 shadow-[0_2px_8px_-2px_rgba(217,83,79,0.25)]">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-error to-error-dark text-white shadow-[0_2px_6px_-1px_rgba(217,83,79,0.55)]">
            <IconWarning size={14} />
          </span>
          <p className="text-[13px] font-medium text-error-dark">
            {needsCorrectionCount} case(s) need correction — please close these on priority.
          </p>
        </div>
      )}

      <Card noPadding>
        <div className="flex items-center justify-between border-b border-divider px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-accent-light to-accent text-white shadow-[0_2px_5px_-1px_rgba(14,165,174,0.5)]">
              <IconFileUp size={13} />
            </span>
            <h2 className="text-[13px] font-semibold text-text-primary">Cases</h2>
          </div>
          {loadError && (
            <Button variant="secondary" size="sm" onClick={() => void loadCases(currentPage, appliedFilters)}>
              Retry
            </Button>
          )}
        </div>
        <Table
          columns={columns}
          data={filteredCases}
          rowKey={(row, idx) => `${row.appointmentId}-${idx}`}
          onRowClick={openCase}
          isLoading={isLoading}
          emptyState={
            <div className="flex flex-col items-center gap-2 py-6">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full ${
                  loadError ? 'bg-error-pale text-error' : 'bg-surface-variant text-text-tertiary'
                }`}
              >
                {loadError ? <IconWarning size={20} /> : <IconFileUp size={20} />}
              </span>
              <p className={`text-sm font-medium ${loadError ? 'text-error' : 'text-text-secondary'}`}>
                {loadError ? 'Could not load the report upload list.' : 'No cases match your search/filters.'}
              </p>
              {!loadError && <p className="text-xs text-text-tertiary">Try adjusting or clearing your filters.</p>}
            </div>
          }
        />
      </Card>

      {totalPages > 1 && (
        <div className="pt-1">
          <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageSelected={goToPage} />
        </div>
      )}
    </div>
  );
}
