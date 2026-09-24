import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getReportUploadViewDocuments } from '../../api/reportUploadApi';
import { getUserData } from '../../lib/storage';
import { pick } from '../../utils/pick';
import { flattenProfileEnvelope } from '../../api/profileApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../lib/toast';
import type { ReportUploadDocument } from '../../types/report';

function isImageFileName(fileName: string | undefined): boolean {
  const ext = (fileName ?? '').split('.').pop()?.toLowerCase() ?? '';
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png';
}

/** The group a document is shown under — `identityName` when the backend sends one (e.g. "ID Proof", "Client Photo"), otherwise the report's own `documentType`, falling back to "Report" for a document with neither. */
function groupLabelOf(doc: ReportUploadDocument): string {
  if (doc.identityName?.trim()) return doc.identityName.trim();
  if (doc.documentType?.trim()) return doc.documentType.trim();
  return 'Report';
}

function groupDocuments(documents: ReportUploadDocument[]): Map<string, ReportUploadDocument[]> {
  const grouped = new Map<string, ReportUploadDocument[]>();
  for (const doc of documents) {
    const key = groupLabelOf(doc);
    const existing = grouped.get(key);
    if (existing) existing.push(doc);
    else grouped.set(key, [doc]);
  }
  return grouped;
}

function IconFolder() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

/**
 * Shows every document uploaded (via the Report Upload flow) for one
 * appointment, grouped the same way the upload form grouped them — ID
 * Proof / Client Photo / Report — each with a "View" action opening a
 * preview. Ported from `ReportDocumentsScreen` (report_documents_screen.dart).
 *
 * Route contract: an optional `clientName` from the `?clientName=` query string.
 */
export function ReportDocumentsPage() {
  const [searchParams] = useSearchParams();
  const clientName = searchParams.get('clientName') ?? '';
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<ReportUploadDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [previewDoc, setPreviewDoc] = useState<ReportUploadDocument | null>(null);

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
      setDocuments(docs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load uploaded documents. Please try again.';
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

  const grouped = groupDocuments(documents);
  const title = clientName || 'Documents';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={title}
        description="Report Documents"
        actions={
          <Button variant="secondary" onClick={() => navigate('/home/view-reports')}>
            Back to list
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <div className="flex items-center gap-2 py-8 text-sm text-text-secondary">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-divider border-t-primary" />
            Loading documents...
          </div>
        </Card>
      ) : loadError ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm font-semibold text-text-primary">Could not load documents</p>
            <Button variant="secondary" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : documents.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-text-tertiary">No documents uploaded for this appointment yet.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from(grouped.entries()).map(([label, docs]) => (
            <Card key={label} className="relative overflow-hidden">
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-gold" />
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary-light to-primary text-white shadow-sm">
                    <IconFolder />
                  </span>
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-primary">{label}</p>
                </div>
                <Badge tone="info">{docs.length}</Badge>
              </div>
              <div className="h-px bg-divider" />
              <div className="flex flex-col divide-y divide-divider pt-1">
                {docs.map((doc, index) => {
                  const isImage = isImageFileName(doc.fileName);
                  const typeLabel = doc.documentType?.trim() || doc.fileName || 'Document';
                  return (
                    <div key={doc.reportUploadId ?? `${label}-${index}`} className="flex items-center gap-3 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-variant text-text-secondary">
                        {isImage ? <IconImage /> : <IconFile />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-text-primary">{typeLabel}</p>
                        {doc.fileName && <p className="truncate text-[11px] text-text-tertiary">{doc.fileName}</p>}
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => setPreviewDoc(doc)}>
                        View
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.documentType?.trim() || previewDoc?.fileName || 'Document'}
        width={420}
      >
        <div className="flex h-64 items-center justify-center rounded-md border border-divider bg-surface-variant">
          {previewDoc && isImageFileName(previewDoc.fileName) && previewDoc.fileWebPath ? (
            <img
              src={previewDoc.fileWebPath}
              alt={previewDoc.fileName ?? ''}
              className="h-full w-full rounded-md object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <span className="text-text-tertiary">
                <IconFile />
              </span>
              <p className="truncate text-[12.5px] font-medium text-text-secondary">
                {previewDoc?.fileName ?? 'Preview unavailable'}
              </p>
              {previewDoc?.fileWebPath && (
                <a
                  href={previewDoc.fileWebPath}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Open in new tab
                </a>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
