import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getRejectQcReportList, uploadReportDocument } from '../../api/reportUploadApi';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { toast } from '../../lib/toast';
import { isImageFileName } from '../../utils/files';
import type { RejectedQcDocument } from '../../types/report';

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Same grouping as the upload form: the picker group (ID Proof / Client Photo), else the document type, else "Report". */
function groupLabelOf(doc: RejectedQcDocument): string {
  if (doc.identityName?.trim()) return doc.identityName.trim();
  return 'DC Report';
}

function docKey(doc: RejectedQcDocument, index: number): string {
  return String(doc.reportUploadId ?? `${doc.fileName ?? 'doc'}-${index}`);
}

/**
 * Documents of one QC-rejected case/appointment, where the DC can view each
 * file and re-upload a replacement. Separate from the View Report documents
 * page so the rejection/re-upload flow can evolve on its own (QC remarks, a
 * dedicated re-upload endpoint, per-document pass/fail once the backend
 * exposes them).
 *
 * Route contract: `caseId`/`appointmentId` from the route params; optional
 * `?clientName=` and `?insurance=` (used as the upload's `IC_Name`).
 */
export function DcDiscrepancyDocumentsPage() {
  const { caseId: caseIdParam, appointmentId: appointmentIdParam } = useParams<{ caseId: string; appointmentId: string }>();
  const [searchParams] = useSearchParams();
  const clientName = searchParams.get('clientName') ?? '';
  const insurance = searchParams.get('insurance') ?? '';
  const navigate = useNavigate();

  const caseId = Number(caseIdParam);
  const appointmentId = Number(appointmentIdParam);

  const [documents, setDocuments] = useState<RejectedQcDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<RejectedQcDocument | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  /** Keys of documents re-uploaded this session — shown as "Re-uploaded". */
  const [reuploaded, setReuploaded] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadTarget = useRef<{ doc: RejectedQcDocument; key: string } | null>(null);

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      setDocuments(await getRejectQcReportList(caseId, appointmentId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load documents. Please try again.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(caseId) || !Number.isFinite(appointmentId)) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, appointmentId]);

  function startReupload(doc: RejectedQcDocument, key: string) {
    reuploadTarget.current = { doc, key };
    fileInputRef.current?.click();
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const target = reuploadTarget.current;
    if (!file || !target) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error('Only PDF, JPG, JPEG or PNG files are allowed.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File size must be 5 MB or less.');
      return;
    }

    setUploadingKey(target.key);
    try {
      await uploadReportDocument({
        caseId,
        appointmentId,
        documentTypeId: target.doc.documentTypeId,
        documentTypeName: target.doc.documentType || target.doc.groupTestName,
        icName: insurance || undefined,
        file,
        remark: target.doc.finalRemark ?? '',
      });
      toast.success(`${target.doc.documentType || 'Document'} re-uploaded — pending re-verification.`);
      setReuploaded((prev) => new Set(prev).add(target.key));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not re-upload the document. Please try again.');
    } finally {
      setUploadingKey(null);
    }
  }

  const grouped = new Map<string, { doc: RejectedQcDocument; key: string }[]>();
  documents.forEach((doc, index) => {
    const label = groupLabelOf(doc);
    const entry = { doc, key: docKey(doc, index) };
    const existing = grouped.get(label);
    if (existing) existing.push(entry);
    else grouped.set(label, [entry]);
  });

  const title = clientName || (Number.isFinite(caseId) ? `Case #${caseId}` : 'Documents');

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={title}
        description={`Case ${Number.isFinite(caseId) ? caseId : '—'} · Appointment ${Number.isFinite(appointmentId) ? appointmentId : '—'}`}
        actions={
          <Button variant="secondary" onClick={() => navigate('/home/dc-discrepancy')}>
            Back to list
          </Button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => void onFilePicked(e)}
      />

      <div className="rounded-lg border border-error/30 bg-error-pale p-4 text-[13px] font-semibold text-error">
        {(() => {
          const remark = documents.find((d) => d.qcRemark)?.qcRemark;
          return remark ? `QC Remark : ${remark}` : 'QC rejected the documents below — re-upload each one that needs correction.';
        })()}
      </div>

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
          <p className="py-8 text-center text-sm text-text-tertiary">No rejected documents found for this appointment.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from(grouped.entries()).map(([label, entries]) => (
            <Card key={label}>
              <div className="flex items-center justify-between pb-3">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-primary">{label}</p>
                <Badge tone="info">{entries.length}</Badge>
              </div>
              <div className="h-px bg-divider" />
              <div className="flex flex-col divide-y divide-divider pt-1">
                {entries.map(({ doc, key }) => {
                  const busy = uploadingKey === key;
                  const qcRemark = (doc.documentDisplayName || doc.remark || doc.qcRemark)?.trim();
                  return (
                    <div key={key} className="flex flex-col gap-2 py-3">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-text-primary">
                            {doc.documentType?.trim() || doc.groupTestName?.trim() || doc.fileName || 'Document'}
                          </p>
                          {doc.fileName && <p className="truncate text-[11px] text-text-tertiary">{doc.fileName}</p>}
                        </div>
                        {reuploaded.has(key) && <Badge tone="warning">Re-uploaded</Badge>}
                        <Button variant="secondary" size="sm" onClick={() => setPreviewDoc(doc)}>
                          View
                        </Button>
                        <Button size="sm" disabled={busy || uploadingKey !== null} onClick={() => startReupload(doc, key)}>
                          {busy ? 'Uploading...' : 'Re-upload'}
                        </Button>
                      </div>
                      {qcRemark && (
                        <p className="rounded-md bg-error-pale px-3 py-2 text-[12px] text-error">{qcRemark}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <DocumentPreviewModal
        label={previewDoc ? previewDoc.documentType?.trim() || previewDoc.fileName || 'Document' : null}
        onClose={() => setPreviewDoc(null)}
        imageUrl={previewDoc && isImageFileName(previewDoc.fileName) ? previewDoc.fileWebPath : null}
        fileName={previewDoc?.fileName}
        openUrl={previewDoc?.fileWebPath}
      />
    </div>
  );
}
