import { useEffect, useMemo, useState } from 'react';
import { getAppointmentDetailsByProvider } from '../../api/appointmentApi';
import { getVisitType } from '../../api/ddlApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table, type TableColumn } from '../../components/ui/Table';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { IconCalendar, IconWarning } from '../../components/icons';
import { toast } from '../../lib/toast';
import { AppointmentDetailModal } from './components/AppointmentDetailModal';
import { CalendarCard } from './components/CalendarCard';
import { FilterPanel } from './components/FilterPanel';
import { formatDate, isSameDay, mapAppointmentDetailsToModels, splitTestNames, type AppointmentUIModel } from './types';

function statusTone(status: string): BadgeTone {
  switch (status.toLowerCase()) {
    case 'fixed':
    case 'completed':
      return 'success';
    case 'confirmed':
      return 'info';
    case 'pending':
      return 'warning';
    case 'cancelled':
    case 'canceled':
      return 'error';
    default:
      return 'neutral';
  }
}

/**
 * The Appointments screen — compact collapsible calendar in a side panel,
 * a horizontal filter row, and a sortable data table of results (replacing
 * the old full-width card list). Ported from `AppointmentScreenWeb`
 * (appointment_screen_web.dart).
 */
export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentUIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [visitTypeFilter, setVisitTypeFilter] = useState<string | null>(null);
  const [testTypeFilter, setTestTypeFilter] = useState<string | null>(null);

  // Visit Type options come from the DDL catalogue (falls back to whatever
  // values are present in the loaded appointments if the call fails), Test
  // Type has no dedicated endpoint in either app so it's derived from the
  // loaded data, same as the Dart screen's local `_testTypeOptions` getter.
  const [visitTypeDdlOptions, setVisitTypeDdlOptions] = useState<string[] | null>(null);

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentUIModel | null>(null);

  async function loadAppointments() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const details = await getAppointmentDetailsByProvider();
      setAppointments(mapAppointmentDetailsToModels(details));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load appointments. Please try again.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAppointments();
  }, []);

  useEffect(() => {
    let cancelled = false;
    getVisitType()
      .then((options) => {
        if (!cancelled) setVisitTypeDdlOptions(options.map((o) => o.label));
      })
      .catch(() => {
        // Keep the data-derived fallback.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statusOptions = useMemo(
    () => Array.from(new Set(appointments.map((a) => a.status))).filter(Boolean),
    [appointments],
  );
  const visitTypeOptions = useMemo(() => {
    if (visitTypeDdlOptions && visitTypeDdlOptions.length > 0) return visitTypeDdlOptions;
    return Array.from(new Set(appointments.map((a) => a.visitType))).filter(Boolean);
  }, [appointments, visitTypeDdlOptions]);
  // `testType` is never populated by the API (see its type comment) — the
  // real per-test data lives in the joined `test` field (e.g. "abx, bcd,
  // sfsd"), so split that into individual names instead of filtering on the
  // whole comma-joined blob as one option.
  const testTypeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const a of appointments) {
      for (const name of splitTestNames(a.test)) names.add(name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [appointments]);

  const hasActiveFilters = statusFilter !== null || visitTypeFilter !== null || testTypeFilter !== null;

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return appointments.filter((a) => {
      const matchesDay = selectedDay === null || isSameDay(a.date, selectedDay);
      const matchesSearch =
        query === '' || a.patientName.toLowerCase().includes(query) || a.proposalNo.toLowerCase().includes(query);
      const matchesStatus = statusFilter === null || a.status === statusFilter;
      const matchesVisitType = visitTypeFilter === null || a.visitType === visitTypeFilter;
      const matchesTestType = testTypeFilter === null || splitTestNames(a.test).includes(testTypeFilter);
      return matchesDay && matchesSearch && matchesStatus && matchesVisitType && matchesTestType;
    });
  }, [appointments, selectedDay, searchQuery, statusFilter, visitTypeFilter, testTypeFilter]);

  function hasAppointmentsOn(day: Date): boolean {
    return appointments.some((a) => isSameDay(a.date, day));
  }

  function clearAllFilters() {
    setSelectedDay(null);
    setStatusFilter(null);
    setVisitTypeFilter(null);
    setTestTypeFilter(null);
  }

  const selectedDateLabel = selectedDay ? formatDate(selectedDay) : 'All dates';
  const hasFilters = hasActiveFilters || searchQuery.trim() !== '';

  const columns: TableColumn<AppointmentUIModel>[] = [
    {
      key: 'date',
      header: 'Date & Time',
      sortable: true,
      sortValue: (row) => row.date.getTime(),
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] text-text-primary">
          {formatDate(row.date, 'dd-MMM-yyyy')} · {row.time}
        </span>
      ),
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
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-text-primary">{row.patientName || '—'}</p>
            <p className="truncate text-[11px] text-text-tertiary">{row.proposalNo || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'visitType', header: 'Visit Type', sortable: true, render: (row) => row.visitType || '—' },
    { key: 'test', header: 'Tests', render: (row) => <span className="text-text-secondary">{row.test || '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '90px',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedAppointment(row)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Appointments"
        description="Track, search and manage every scheduled visit."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-appointment-accent/25 bg-appointment-pale py-1 pl-1 pr-3 text-[12.5px] font-semibold text-appointment-accent shadow-[0_1px_2px_rgba(108,92,231,0.12)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-appointment-accent text-white shadow-[0_2px_6px_-1px_rgba(108,92,231,0.6)]">
              <IconCalendar size={11} />
            </span>
            {filteredAppointments.length} appointments
          </span>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[260px_1fr]">
        <CalendarCard selectedDay={selectedDay} onSelectDay={setSelectedDay} hasAppointments={hasAppointmentsOn} />

        <div className="flex min-w-0 flex-col gap-4">
          <FilterPanel
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            statusOptions={statusOptions}
            visitTypeOptions={visitTypeOptions}
            testTypeOptions={testTypeOptions}
            statusFilter={statusFilter}
            visitTypeFilter={visitTypeFilter}
            testTypeFilter={testTypeFilter}
            onStatusChange={setStatusFilter}
            onVisitTypeChange={setVisitTypeFilter}
            onTestTypeChange={setTestTypeFilter}
            hasActiveFilters={hasActiveFilters || selectedDay !== null}
            onClearAll={clearAllFilters}
          />

          <Card noPadding>
            <div className="flex items-center justify-between border-b border-divider px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-appointment-accent to-appointment-accent/70 text-white shadow-[0_2px_5px_-1px_rgba(108,92,231,0.5)]">
                  <IconCalendar size={13} />
                </span>
                <h2 className="text-[13px] font-semibold text-text-primary">Appointments · {selectedDateLabel}</h2>
              </div>
              {loadError && (
                <Button variant="secondary" size="sm" onClick={() => void loadAppointments()}>
                  Retry
                </Button>
              )}
            </div>
            <Table
              columns={columns}
              data={filteredAppointments}
              rowKey={(row, idx) => `${row.appointmentId}-${idx}`}
              onRowClick={(row) => setSelectedAppointment(row)}
              isLoading={isLoading}
              emptyState={
                <div className="flex flex-col items-center gap-2 py-6">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                      loadError ? 'bg-error-pale text-error' : 'bg-surface-variant text-text-tertiary'
                    }`}
                  >
                    {loadError ? <IconWarning size={20} /> : <IconCalendar size={20} />}
                  </span>
                  <p className={`text-sm font-medium ${loadError ? 'text-error' : 'text-text-secondary'}`}>
                    {loadError
                      ? 'Could not load appointments.'
                      : hasFilters
                        ? 'No appointments match your search/filters.'
                        : 'No appointments for this date.'}
                  </p>
                  {!loadError && hasFilters && (
                    <p className="text-xs text-text-tertiary">Try adjusting or clearing your filters.</p>
                  )}
                </div>
              }
            />
          </Card>
        </div>
      </div>

      {selectedAppointment && (
        <AppointmentDetailModal item={selectedAppointment} onClose={() => setSelectedAppointment(null)} />
      )}
    </div>
  );
}
