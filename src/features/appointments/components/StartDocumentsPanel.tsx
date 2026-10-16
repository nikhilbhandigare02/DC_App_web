import { useEffect, useState } from 'react';
import { LoadingOverlay } from '../../../components/ui/LoadingOverlay';
import { getClientPhotoDropdown, getIdProofDropdown, uploadReportDocument } from '../../../api/reportUploadApi';
import type { DdlOptionModel } from '../../../types/ddl';
import { Button } from '../../../components/ui/Button';
import { DocumentPreviewModal } from '../../../components/ui/DocumentPreviewModal';
import { toast } from '../../../lib/toast';
import type { AppointmentUIModel } from '../types';
import { AddTypeMenu } from './AddTypeMenu';
import { DocumentStatusTable, type DocFileEntry } from './DocumentStatusTable';
import { useGeoDocumentPicker } from '../useGeoDocumentPicker';

function toIdMap(options: DdlOptionModel[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const option of options) {
    const parsed = Number(option.value);
    map[option.label] = Number.isFinite(parsed) ? parsed : 0;
  }
  return map;
}

interface StartDocumentsPanelProps {
  item: AppointmentUIModel;
  /** Back to the appointment details. */
  onBack: () => void;
  /** Called after "Complete Test Checklist" uploaded everything. */
  onDone: () => void;
}

/**
 * What "Start" shows inside the appointment dialog (no navigation): the
 * Client Photo and ID Proof pickers. Client Photo is camera-only, ID Proof
 * takes camera or gallery, and every image is geo-tagged. Picked files are
 * only staged here — "Complete Test Checklist" uploads them all through the
 * document-upload API.
 */
export function StartDocumentsPanel({ item, onBack, onDone }: StartDocumentsPanelProps) {
  const [clientPhotoOptions, setClientPhotoOptions] = useState<string[]>([]);
  const [idProofOptions, setIdProofOptions] = useState<string[]>([]);
  const [clientPhotoIds, setClientPhotoIds] = useState<Record<string, number>>({});
  const [idProofIds, setIdProofIds] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectedProofs, setSelectedProofs] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<Record<string, DocFileEntry>>({});
  const [submitting, setSubmitting] = useState(false);

  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const { pickClientPhoto, pickIdProof, pickerUi } = useGeoDocumentPicker();

  useEffect(() => {
    let cancelled = false;
    Promise.all([getClientPhotoDropdown(), getIdProofDropdown()])
      .then(([photos, proofs]) => {
        if (cancelled) return;
        setClientPhotoOptions(photos.map((o) => o.label));
        setClientPhotoIds(toIdMap(photos));
        setIdProofOptions(proofs.map((o) => o.label));
        setIdProofIds(toIdMap(proofs));
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Could not load the options.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(set: Set<string>, setter: (next: Set<string>) => void, option: string, checked: boolean) {
    const next = new Set(set);
    if (checked) next.add(option);
    else next.delete(option);
    setter(next);
  }

  async function handlePick(doc: string, isClientPhoto: boolean) {
    const file = isClientPhoto ? await pickClientPhoto() : await pickIdProof();
    if (!file) return;
    const isEdit = Boolean(files[doc]);
    setFiles((prev) => ({ ...prev, [doc]: { file, state: 'pending' } }));
    toast.success(isEdit ? 'File updated successfully' : 'File added successfully');
  }

  function setFileState(doc: string, state: DocFileEntry['state']) {
    setFiles((prev) => (prev[doc] ? { ...prev, [doc]: { ...prev[doc], state } } : prev));
  }

  async function upload(doc: string): Promise<boolean> {
    const entry = files[doc];
    const caseId = Number(item.caseId);
    const appointmentId = Number(item.appointmentId);
    if (!entry || !Number.isFinite(caseId) || !Number.isFinite(appointmentId)) {
      setFileState(doc, 'error');
      return false;
    }
    setFileState(doc, 'uploading');
    try {
      await uploadReportDocument({
        caseId,
        appointmentId,
        documentTypeId: idProofIds[doc] ?? clientPhotoIds[doc],
        documentTypeName: doc,
        icName: item.insuranceCompany,
        file: entry.file,
        isNew: false,
      });
      setFileState(doc, 'uploaded');
      toast.success(`${doc} uploaded successfully`);
      return true;
    } catch {
      setFileState(doc, 'error');
      return false;
    }
  }

  /** Every selected type needs a file; then each staged file is uploaded and the dialog closes once all succeed. */
  async function handleComplete() {
    if (submitting) return;
    const selected = [...selectedPhotos, ...selectedProofs];
    if (selected.length === 0) {
      toast.error('Select a Client Photo and an ID Proof first.');
      return;
    }
    const missing = selected.filter((doc) => !files[doc]);
    if (missing.length > 0) {
      toast.error(`Add a file for: ${missing.join(', ')}.`);
      return;
    }

    setSubmitting(true);
    const failed: string[] = [];
    for (const doc of selected) {
      if (files[doc]?.state === 'uploaded') continue;
      if (!(await upload(doc))) failed.push(doc);
    }
    setSubmitting(false);

    if (failed.length > 0) {
      toast.error(`Failed to upload: ${failed.join(', ')}.`);
      return;
    }
    toast.success('Documents uploaded successfully');
    onDone();
  }

  const noop = () => undefined;

  return (
    <div className="flex flex-col gap-5">
      {loading ? (
        <div className="flex justify-center py-10">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <section>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-text-primary">Client Photo</h3>
              <AddTypeMenu
                label="Client Photo"
                options={clientPhotoOptions}
                selected={selectedPhotos}
                onToggle={(o, c) => toggle(selectedPhotos, setSelectedPhotos, o, c)}
              />
            </div>
            <DocumentStatusTable
              columnLabel="Client Photo"
              docs={clientPhotoOptions.filter((o) => selectedPhotos.has(o))}
              files={files}
              stageOnly
              onChooseFile={(doc) => void handlePick(doc, true)}
              onUpload={noop}
              onPreview={(doc) => {
                setPreviewLabel(doc);
                setPreviewFile(files[doc]?.file ?? null);
              }}
              emptyMessage="Select one or more Client Photo types above."
            />
          </section>

          <section>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-text-primary">ID Proof</h3>
              <AddTypeMenu
                label="ID Proof"
                options={idProofOptions}
                selected={selectedProofs}
                onToggle={(o, c) => toggle(selectedProofs, setSelectedProofs, o, c)}
              />
            </div>
            <DocumentStatusTable
              columnLabel="ID Proof"
              docs={idProofOptions.filter((o) => selectedProofs.has(o))}
              files={files}
              stageOnly
              onChooseFile={(doc) => void handlePick(doc, false)}
              onUpload={noop}
              onPreview={(doc) => {
                setPreviewLabel(doc);
                setPreviewFile(files[doc]?.file ?? null);
              }}
              emptyMessage="Select one or more ID Proof types above."
            />
          </section>
        </>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-divider pt-3">
        <Button variant="secondary" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button onClick={() => void handleComplete()} isLoading={submitting} disabled={loading}>
          Complete Test Checklist
        </Button>
      </div>

      <DocumentPreviewModal label={previewLabel} file={previewFile} onClose={() => setPreviewLabel(null)} />
      {pickerUi}
      {submitting && <LoadingOverlay message="Uploading documents..." />}
    </div>
  );
}
