import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReportUploadViewDocuments } from '../../api/reportUploadApi';
import { getUserData } from '../../lib/storage';
import { pick } from '../../utils/pick';
import { flattenProfileEnvelope } from '../../api/profileApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table, type TableColumn } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { toast } from '../../lib/toast';

/** One case/appointment row shown in the View Report list. */
interface CaseAppointment {
  caseId: number;
  appointmentId: number;
  documentCount: number;
  documentTypes: string[]; // Array of document types for this case/appointment
  documentNames: string[]; // Array of file names for this case/appointment
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
 * "View Report" — lists every case/appointment that has documents uploaded via
 * the Report Upload flow, grouped by case/appointment with document count.
 * Clicking opens {@link ReportDocumentsPage} to show all documents for that
 * specific case/appointment. Ported from `ViewReportsScreen`
 * (view_reports_screen.dart), restyled around the shared sortable `Table`.
 */
export function ViewReportsPage() {
  const navigate = useNavigate();

  const [caseAppointments, setCaseAppointments] = useState<CaseAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const cached = (getUserData() ?? {}) as Record<string, unknown>;
      const cachedRow = flattenProfileEnvelope(cached);
      const dcProviderId = pick(cachedRow, 'ProviderNumber', 'providerNumber', 'provider_number') ?? '';

      if (!dcProviderId) {
        throw new Error('Provider ID not found. Please login again.');
      }

      const docs = await getReportUploadViewDocuments(String(dcProviderId));

      // Group documents by caseId and appointmentId, collecting types and names
      const grouped = new Map<string, { count: number; types: Set<string>; names: string[] }>();
      for (const doc of docs) {
        const key = `${doc.caseId ?? 0}-${doc.appointmentId ?? 0}`;
        const existing = grouped.get(key) || { count: 0, types: new Set<string>(), names: [] };
        existing.count++;
        if (doc.documentType) existing.types.add(doc.documentType);
        if (doc.fileName) existing.names.push(doc.fileName);
        grouped.set(key, existing);
      }

      // Convert to array of CaseAppointment
      const caseApptList: CaseAppointment[] = Array.from(grouped.entries()).map(([key, data]) => {
        const [caseId, appointmentId] = key.split('-').map(Number);
        return {
          caseId,
          appointmentId,
          documentCount: data.count,
          documentTypes: Array.from(data.types),
          documentNames: data.names,
        };
      });

      setCaseAppointments(caseApptList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load reports. Please try again.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return caseAppointments;
    return caseAppointments.filter(
      (ca) =>
        String(ca.caseId).includes(query) ||
        String(ca.appointmentId).includes(query),
    );
  }, [caseAppointments, searchQuery]);

  function openCaseAppointment(caseAppt: CaseAppointment) {
    navigate(
      `/home/view-reports/documents/${caseAppt.caseId}/${caseAppt.appointmentId}?clientName=Case ${caseAppt.caseId}`,
    );
  }

  const columns: TableColumn<CaseAppointment>[] = [
    { key: 'caseId', header: 'Case ID', sortable: true, render: (row) => row.caseId || '—' },
    { key: 'appointmentId', header: 'Appointment ID', sortable: true, render: (row) => row.appointmentId || '—' },
    {
      key: 'documentTypes',
      header: 'Document Types',
      render: (row) => (
        <div className="max-w-xs">
          {row.documentTypes.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.documentTypes.slice(0, 3).map((type, index) => (
                <Badge key={index} tone="info">
                  {type}
                </Badge>
              ))}
              {row.documentTypes.length > 3 && (
                <Badge tone="neutral">+{row.documentTypes.length - 3}</Badge>
              )}
            </div>
          ) : (
            <span className="text-text-tertiary">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'documentNames',
      header: 'File Names',
      render: (row) => (
        <div className="max-w-xs">
          {row.documentNames.length > 0 ? (
            <div className="text-xs text-text-secondary">
              {row.documentNames.slice(0, 2).map((name, index) => (
                <div key={index} className="truncate">
                  {name}
                </div>
              ))}
              {row.documentNames.length > 2 && (
                <div className="text-text-tertiary">+{row.documentNames.length - 2} more</div>
              )}
            </div>
          ) : (
            <span className="text-text-tertiary">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'documentCount',
      header: 'Total',
      align: 'center',
      width: '80px',
      render: (row) => <Badge tone="info">{row.documentCount}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="View Report" description="Browse cases and appointments with uploaded documents." />

      <Card>
        <Input
          placeholder="Search by case ID or appointment ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<SearchIcon />}
        />
      </Card>

      <Card>
        <Table
          columns={columns}
          data={filtered}
          rowKey={(row) => `${row.caseId}-${row.appointmentId}`}
          onRowClick={openCaseAppointment}
          isLoading={isLoading}
          emptyState={loadError ?? 'No case/appointments with documents yet.'}
        />
      </Card>
    </div>
  );
}
