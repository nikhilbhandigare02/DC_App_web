import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReportUploadViewDocuments } from '../../api/reportUploadApi';
import { getUserData } from '../../lib/storage';
import { pick } from '../../utils/pick';
import { flattenProfileEnvelope } from '../../api/profileApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Table, type TableColumn } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { toast } from '../../lib/toast';

/** One document row shown in the View Report list. */
interface ReportDocument {
  reportUploadId: number;
  caseId: number;
  appointmentId: number;
  documentType: string;
  identityName: string;
  fileName: string;
  fileWebPath: string;
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
 * "View Report" — lists all documents uploaded via the Report Upload flow,
 * and opens {@link ReportDocumentsPage} to show document details.
 * Ported from `ViewReportsScreen` (view_reports_screen.dart), restyled
 * around the shared sortable `Table`.
 */
export function ViewReportsPage() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<ReportDocument[]>([]);
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
      const mappedDocs: ReportDocument[] = docs.map((doc) => ({
        reportUploadId: doc.reportUploadId ?? 0,
        caseId: doc.caseId ?? 0,
        appointmentId: doc.appointmentId ?? 0,
        documentType: doc.documentType || 'Unknown',
        identityName: doc.identityName || 'Unknown',
        fileName: doc.fileName || 'Unknown',
        fileWebPath: doc.fileWebPath || '',
      }));
      setDocuments(mappedDocs);
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
    if (!query) return documents;
    return documents.filter(
      (d) =>
        d.identityName.toLowerCase().includes(query) ||
        d.documentType.toLowerCase().includes(query) ||
        String(d.caseId).includes(query) ||
        String(d.appointmentId).includes(query),
    );
  }, [documents, searchQuery]);

  function openDocument(doc: ReportDocument) {
    navigate(
      `/home/view-reports/documents?clientName=${encodeURIComponent(doc.identityName)}`,
    );
  }

  const columns: TableColumn<ReportDocument>[] = [
    {
      key: 'identityName',
      header: 'Category',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary text-[11px] font-semibold text-white">
            {row.identityName.trim() ? row.identityName.trim()[0].toUpperCase() : '?'}
          </span>
          <span className="truncate text-[13px] font-medium text-text-primary">{row.identityName || 'Unknown'}</span>
        </div>
      ),
    },
    { key: 'documentType', header: 'Document Type', sortable: true, render: (row) => row.documentType || '—' },
    { key: 'caseId', header: 'Case ID', sortable: true, render: (row) => row.caseId || '—' },
    { key: 'appointmentId', header: 'Appointment ID', sortable: true, render: (row) => row.appointmentId || '—' },
    { key: 'fileName', header: 'File Name', render: (row) => row.fileName || '—' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="View Report" description="Browse all uploaded documents." />

      <Card>
        <Input
          placeholder="Search by category, document type, or case/appointment ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<SearchIcon />}
        />
      </Card>

      <Card>
        <Table
          columns={columns}
          data={filtered}
          rowKey={(row) => `${row.reportUploadId}`}
          onRowClick={openDocument}
          isLoading={isLoading}
          emptyState={loadError ?? 'No documents uploaded yet.'}
        />
      </Card>
    </div>
  );
}
