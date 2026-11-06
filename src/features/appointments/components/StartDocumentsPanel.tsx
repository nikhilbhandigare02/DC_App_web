import { useEffect, useState } from 'react';
import { LoadingOverlay } from '../../../components/ui/LoadingOverlay';
import {
  appointmentDone,
  getClientPhotoDropdown,
  getIdProofDropdown,
  getRecallStatus,
  getTestsByAppointment,
  saveShowFollowUp,
  uploadReportDocument,
  type AppointmentTest,
} from '../../../api/reportUploadApi';
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

  // Tests of this appointment; the ticked ones are completed, the rest are recalled.
  const [tests, setTests] = useState<AppointmentTest[]>([]);
  const [doneTestIds, setDoneTestIds] = useState<Set<number>>(new Set());
  // Picked only (typing is blocked): yyyy-MM-dd and HH:mm.
  const [recallDate, setRecallDate] = useState('');
  const [recallTime, setRecallTime] = useState('');
  const doneTests = tests.filter((t) => doneTestIds.has(t.id));
  const remainingTests = tests.filter((t) => !doneTestIds.has(t.id));

  useEffect(() => {
    let cancelled = false;
    getTestsByAppointment(Number(item.appointmentId))
      .then((list) => {
        if (cancelled) return;
        setTests(list);
        setDoneTestIds(new Set(list.map((t) => t.id)));
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Could not load the tests.');
      });
    return () => {
      cancelled = true;
    };
  }, [item.appointmentId]);

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

  if (tests.length > 0) {
    if (doneTests.length === 0) {
      toast.error('Select the tests completed by the client.');
      return;
    }
    if (remainingTests.length > 0) {
      if (!recallDate || !recallTime) {
        toast.error('Select the recall date and time for the remaining tests.');
        return;
      }
      if (new Date(`${recallDate}T${recallTime}:00`).getTime() <= Date.now()) {
        toast.error('The recall date and time must be in the future.');
        return;
      }
    }
  }

  setSubmitting(true);

  const selected = [...selectedPhotos, ...selectedProofs];
  const failed: string[] = [];

  for (const doc of selected) {
    if (files[doc]?.state === 'uploaded') continue;

    if (!files[doc]) continue;

    if (!(await upload(doc))) {
      failed.push(doc);
    }
  }

  if (failed.length > 0) {
    setSubmitting(false);
    toast.error(`Failed to upload: ${failed.join(', ')}.`);
    return;
  }

  try {
    if (tests.length > 0) {
      await saveShowFollowUp({
        caseId: Number(item.caseId),
        appointmentId: Number(item.appointmentId),
        doneTests,
        remainingTests,
        recallStatus: remainingTests.length > 0 ? await getRecallStatus() : undefined,
        recallDate,
        recallTime,
      });
    } else {
      await appointmentDone(Number(item.appointmentId));
    }
  } catch (err) {
    setSubmitting(false);
    toast.error(err instanceof Error ? err.message : 'Could not complete the appointment. Please try again.');
    return;
  }

  setSubmitting(false);
  toast.success('Appointment completed successfully');
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
              // emptyMessage="Select one or more ID Proof types above."
            />
          </section>
        </>
      )}

      {tests.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-[13px] font-semibold text-text-primary">Tests completed</h3>
          <div className="flex flex-col gap-2">
            {tests.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-[13px] text-text-primary">
                <input
                  type="checkbox"
                  checked={doneTestIds.has(t.id)}
                  onChange={(e) =>
                    setDoneTestIds((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(t.id);
                      else next.delete(t.id);
                      return next;
                    })
                  }
                />
                {t.name}
              </label>
            ))}
          </div>
          {remainingTests.length > 0 && (
            <div className="mt-3 rounded-lg border-2 border-primary bg-primary/5 p-3">
              <span className="mb-2 inline-block rounded-full bg-primary px-3 py-0.5 text-[12px] font-semibold text-white">
                Recall
              </span>
              <p className="mb-1 text-[12px] text-text-secondary">Tests to be recalled:</p>
              <ul className="mb-3 list-disc pl-5 text-[13px] text-text-primary">
                {remainingTests.map((t) => (
                  <li key={t.id}>{t.name}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold text-text-primary">Recall Date</label>
                  <input
                    type="date"
                    value={recallDate}
                    min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)}
                    onChange={(e) => setRecallDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Tab') e.preventDefault();
                    }}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    className="cursor-pointer rounded-md border border-divider bg-white px-2 py-1.5 text-[13px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-semibold text-text-primary">Recall Time</label>
                  <input
                    type="time"
                    value={recallTime}
                    onChange={(e) => setRecallTime(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Tab') e.preventDefault();
                    }}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    className="cursor-pointer rounded-md border border-divider bg-white px-2 py-1.5 text-[13px]"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-divider pt-3">
        <Button variant="secondary" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button onClick={() => void handleComplete()} isLoading={submitting} disabled={loading}>
          Appointment Done
        </Button>
      </div>

      <DocumentPreviewModal label={previewLabel} file={previewFile} onClose={() => setPreviewLabel(null)} />
      {pickerUi}
      {submitting && <LoadingOverlay message="Uploading documents..." />}
    </div>
  );
}
