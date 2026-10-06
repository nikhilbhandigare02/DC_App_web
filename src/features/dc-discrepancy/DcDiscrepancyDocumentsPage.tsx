import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  getDCReportDropdown,
  getRejectQcReportList,
  updateReportDocument,
  uploadedReportId,
  uploadReportDocument,
} from '../../api/reportUploadApi';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { PaginationBar } from '../../components/ui/PaginationBar';
import { toast } from '../../lib/toast';
import { isImageFileName } from '../../utils/files';
import { usePagination } from '../../utils/usePagination';
import type { RejectedQcDocument } from '../../types/report';

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Same grouping as the upload form: the picker group (ID Proof / Client Photo), else the document type, else "Report". */
function groupLabelOf(doc: RejectedQcDocument): string {
  if (doc.identityName?.trim()) return doc.identityName.trim();
  return 'DC Report';
}

/** A rejected document the DC has already re-uploaded; kept so the row shows "Edit" instead of "Re-upload". */
interface ReuploadRecord {
  /** `reportUploadId` of the re-uploaded row — what "Edit" updates. */
  uploadId: number;
  typeId: number;
  typeName: string;
}

const reuploadStorageKey = (caseId: number, appointmentId: number) => `dc_reuploads:${caseId}:${appointmentId}`;

function loadReuploads(caseId: number, appointmentId: number): Record<string, ReuploadRecord> {
  try {
    const raw = localStorage.getItem(reuploadStorageKey(caseId, appointmentId));
    return raw ? (JSON.parse(raw) as Record<string, ReuploadRecord>) : {};
  } catch {
    return {};
  }
}

function saveReuploads(caseId: number, appointmentId: number, value: Record<string, ReuploadRecord>) {
  try {
    localStorage.setItem(reuploadStorageKey(caseId, appointmentId), JSON.stringify(value));
  } catch {
    // Storage unavailable — the row falls back to showing "Re-upload" after a reload.
  }
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
  /** Files picked but not uploaded yet, by document key — nothing is sent until the row's "Upload" button is pressed. */
  const [staged, setStaged] = useState<
    Record<string, { file: File; typeId: number; typeName: string; mode: 'new' | 'edit' }>
  >({});
  /** Documents already re-uploaded (persisted per case/appointment) — their Re-upload button is disabled and an Edit button is shown. */
  const [reuploads, setReuploads] = useState<Record<string, ReuploadRecord>>(() => loadReuploads(caseId, appointmentId));

  /** "DC Report" dropdown (label -> id), the same list the report upload form uses for its document type ids. */
  const [dcReportTypeIds, setDcReportTypeIds] = useState<Record<string, number>>({});
  const [dcReportOptions, setDcReportOptions] = useState<{ label: string; id: number }[]>([]);
  /** Set when a DC Report document's type can't be matched by name — the DC picks it from the dropdown. */
  const [typePicker, setTypePicker] = useState<{ doc: RejectedQcDocument; key: string } | null>(null);
  const [pickedTypeId, setPickedTypeId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadTarget = useRef<{
    doc: RejectedQcDocument;
    key: string;
    typeId: number;
    typeName: string;
    mode: 'new' | 'edit';
  } | null>(null);

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
    getDCReportDropdown()
      .then((options) => {
        const map: Record<string, number> = {};
        const list: { label: string; id: number }[] = [];
        for (const option of options) {
          const id = Number(option.value);
          if (!Number.isFinite(id)) continue;
          map[option.label.trim().toLowerCase()] = id;
          list.push({ label: option.label, id });
        }
        setDcReportTypeIds(map);
        setDcReportOptions(list);
      })
      .catch(() => {
        // Without the list, group-wise re-uploads fall back to the document's own type id.
      });
  }, []);

  /**
   * Document type id sent on re-upload: the document's own id when it has one
   * (ID Proof / Client Photo); otherwise a "DC Report" document, whose id is
   * looked up in the DC Report dropdown by its report/test name — exactly how
   * the report upload form resolves it.
   */
  function documentTypeIdFor(doc: RejectedQcDocument): number | undefined {
    if (doc.documentTypeId && doc.documentTypeId > 0) return doc.documentTypeId;
    for (const name of [doc.documentType, doc.groupTestName, doc.testMappingDocumentName]) {
      const id = name ? dcReportTypeIds[name.trim().toLowerCase()] : undefined;
      if (id != null) return id;
    }
    return undefined;
  }

  useEffect(() => {
    if (!Number.isFinite(caseId) || !Number.isFinite(appointmentId)) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, appointmentId]);

  /**
   * Starts a re-upload. A document with its own type id (ID Proof / Client
   * Photo) or a "DC Report" document whose name is in the DC Report dropdown
   * goes straight to the file picker; otherwise the DC first picks which report
   * type this is — the same dropdown the report upload form takes its
   * `documentTypeId` from — so the id is never missing.
   */
  /** "Edit": pick a new file for a document that was already re-uploaded; it replaces that row in the database. */
  function startEdit(doc: RejectedQcDocument, key: string) {
    const record = reuploads[key];
    if (!record) return;
    reuploadTarget.current = { doc, key, typeId: record.typeId, typeName: record.typeName, mode: 'edit' };
    fileInputRef.current?.click();
  }

  function startReupload(doc: RejectedQcDocument, key: string) {
    const id = documentTypeIdFor(doc);
    if (id != null) {
      reuploadTarget.current = { doc, key, typeId: id, typeName: docTitle(doc), mode: 'new' };
      fileInputRef.current?.click();
      return;
    }
    if (dcReportOptions.length === 0) {
      toast.error('Report types are not available right now. Please try again.');
      return;
    }
    if (dcReportOptions.length === 1) {
      const only = dcReportOptions[0];
      reuploadTarget.current = { doc, key, typeId: only.id, typeName: only.label, mode: 'new' };
      fileInputRef.current?.click();
      return;
    }
    setPickedTypeId('');
    setTypePicker({ doc, key });
  }

  function confirmTypePicker() {
    const option = dcReportOptions.find((o) => String(o.id) === pickedTypeId);
    if (!typePicker || !option) return;
    reuploadTarget.current = {
      doc: typePicker.doc,
      key: typePicker.key,
      typeId: option.id,
      typeName: option.label,
      mode: 'new',
    };
    setTypePicker(null);
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

    // Only stage the file; it is uploaded when the row's "Upload" button is pressed.
    setStaged((prev) => ({ ...prev, [target.key]: { file, typeId: target.typeId, typeName: target.typeName, mode: target.mode } }));
  }

  function cancelStaged(key: string) {
    setStaged((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  /**
   * Sends the file staged for one row, like the report upload form's per-row
   * Upload button. A new re-upload inserts a row and remembers its id; an
   * "Edit" updates that same row.
   */
  async function uploadStaged(doc: RejectedQcDocument, key: string) {
    const entry = staged[key];
    if (!entry) return;
    setUploadingKey(key);
    try {
      if (entry.mode === 'edit') {
        const record = reuploads[key];
        if (!record) throw new Error('Could not find the re-uploaded document to update.');
        await updateReportDocument({
          reportUploadId: record.uploadId,
          caseId,
          appointmentId,
          documentTypeId: entry.typeId,
          documentTypeName: entry.typeName,
          icName: insurance || undefined,
          file: entry.file,
        });
        toast.success(`${docTitle(doc)} updated.`);
      } else {
        const response = await uploadReportDocument({
          caseId,
          appointmentId,
          documentTypeId: entry.typeId,
          documentTypeName: entry.typeName,
          icName: insurance || undefined,
          file: entry.file,
          remark: doc.finalRemark ?? '',
          isNew: true,
        });
        const uploadId = uploadedReportId(response);
        if (uploadId != null) {
          const next = { ...reuploads, [key]: { uploadId, typeId: entry.typeId, typeName: entry.typeName } };
          setReuploads(next);
          saveReuploads(caseId, appointmentId, next);
        }
        toast.success(`${docTitle(doc)} re-uploaded — pending re-verification.`);
      }
      cancelStaged(key);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload the document. Please try again.');
    } finally {
      setUploadingKey(null);
    }
  }

  function docTitle(doc: RejectedQcDocument): string {
    return doc.documentType?.trim() || doc.groupTestName?.trim() || doc.fileName || 'Document';
  }

  // 10 documents per page; the cards below group only the current page's documents.
  const { currentPage, totalPages, pageItems, setPage, totalItems } = usePagination(documents);

  const grouped = new Map<string, { doc: RejectedQcDocument; key: string }[]>();
  pageItems.forEach((doc, index) => {
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
                        {reuploads[key] && <Badge tone="warning">Re-uploaded</Badge>}
                        <Button variant="secondary" size="sm" onClick={() => setPreviewDoc(doc)}>
                          View
                        </Button>
                        {staged[key] ? (
                          <>
                            <Button variant="secondary" size="sm" disabled={busy} onClick={() => cancelStaged(key)}>
                              Remove
                            </Button>
                            <Button size="sm" disabled={busy || uploadingKey !== null} onClick={() => void uploadStaged(doc, key)}>
                              {busy ? 'Uploading...' : staged[key].mode === 'edit' ? 'Update' : 'Upload'}
                            </Button>
                          </>
                        ) : reuploads[key] ? (
                          <>
                            <Button size="sm" disabled>
                              Re-upload
                            </Button>
                            <Button variant="secondary" size="sm" disabled={uploadingKey !== null} onClick={() => startEdit(doc, key)}>
                              Edit
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" disabled={uploadingKey !== null} onClick={() => startReupload(doc, key)}>
                            Re-upload
                          </Button>
                        )}
                      </div>
                      {staged[key] && (
                        <p className="rounded-md bg-surface-variant px-3 py-2 text-[12px] text-text-secondary">
                          Selected: <span className="font-semibold text-text-primary">{staged[key].file.name}</span> — press
                          {staged[key].mode === 'edit' ? 'Update' : 'Upload'} to submit it.
                        </p>
                      )}
                      {qcRemark && (
                        <p className="rounded-md bg-error-pale px-3 py-2 text-[12px] text-error">{qcRemark}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          {totalItems > 0 && (
            <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageSelected={setPage} totalItems={totalItems} />
          )}
        </div>
      )}

      <Modal
        open={typePicker !== null}
        onClose={() => setTypePicker(null)}
        title="Select report type"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTypePicker(null)}>
              Cancel
            </Button>
            <Button disabled={!pickedTypeId} onClick={confirmTypePicker}>
              Choose file
            </Button>
          </>
        }
      >
        <Select
          label="Report type"
          placeholder="Select report type"
          value={pickedTypeId}
          onChange={(e) => setPickedTypeId(e.target.value)}
          options={dcReportOptions.map((o) => ({ value: String(o.id), label: o.label }))}
        />
      </Modal>

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
