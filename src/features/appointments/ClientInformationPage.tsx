import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getAppointmentDetailsById } from '../../api/appointmentApi';
import {
  filterDocumentsByCaseAppointment,
  getClientPhotoDropdown,
  getDCReportDropdown,
  getIdProofDropdown,
  getReportUploadViewDocuments,
  updateReportDocument,
  updateReportRemark,
  uploadedReportId,
  uploadReportDocument,
} from '../../api/reportUploadApi';
import { flattenProfileEnvelope } from '../../api/profileApi';
import { getUserData } from '../../lib/storage';
import { pick } from '../../utils/pick';
import type { ReportUploadDocument } from '../../types/report';
import type { DdlOptionModel } from '../../types/ddl';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Table, type TableColumn } from '../../components/ui/Table';
import { toast } from '../../lib/toast';
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal';
import { LoadingOverlay } from '../../components/ui/LoadingOverlay';
import { IconBadge, IconFileUp, IconInfo } from '../../components/icons';
import type { IconProps } from '../../components/icons';
import { AddTypeMenu } from './components/AddTypeMenu';
import { DocumentStatusTable, type DocFileEntry } from './components/DocumentStatusTable';
import { useGeoDocumentPicker } from './useGeoDocumentPicker';
import { formatDate, formatDobValue, mapAppointmentDetailsToModels, type AppointmentUIModel } from './types';
import type { ComponentType } from 'react';

/** Fallback shown until `GetIdProofDropdown` resolves (or if it fails). */
const FALLBACK_ID_PROOF_OPTIONS = ['Aadhar Card', 'PAN Card', 'Passport', 'Voter ID', 'Driving License'];
/** Fallback shown until `GetClientPhotoDropdown` resolves (or if it fails). */
const FALLBACK_CLIENT_PHOTO_OPTIONS = ['Client Photo', 'Height Photo', 'Weight Machine Photo', 'Signature Photo'];
/** No safe fallback for report types — better to show nothing than a made-up list until `GetDCReport` resolves. */
const FALLBACK_REPORT_TYPE_OPTIONS: string[] = [];

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

function emptyItem(caseId: string, appointmentId: string): AppointmentUIModel {
  return {
    date: new Date(),
    time: '-',
    patientName: '',
    proposalNo: '',
    test: '-',
    testType: '',
    visitType: '',
    status: 'Pending',
    subStatus: '',
    caseId,
    clientProfile: 'Normal',
    gender: '',
    age: 0,
    mobileNo: '',
    insuranceCompany: '',
    dcName: '',
    dob: '',
    appointmentId,
    reportStatus: 'Pending',
    registeredDate: '',
    correctionRemark: '',
  };
}

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_EXTENSIONS.join(',');
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

type SectionAccent = 'primary' | 'accent' | 'gold' | 'appointment-accent' | 'info';

const SECTION_ACCENT_CLASSES: Record<SectionAccent, string> = {
  primary: 'bg-gradient-to-br from-primary-light to-primary text-white shadow-[0_2px_6px_-1px_rgba(18,60,94,0.5)]',
  accent: 'bg-gradient-to-br from-accent-light to-accent text-white shadow-[0_2px_6px_-1px_rgba(14,165,174,0.5)]',
  gold: 'bg-gradient-to-br from-gold to-gold/80 text-white shadow-[0_2px_6px_-1px_rgba(201,154,61,0.55)]',
  'appointment-accent':
    'bg-gradient-to-br from-appointment-accent to-appointment-accent/70 text-white shadow-[0_2px_6px_-1px_rgba(108,92,231,0.5)]',
  info: 'bg-gradient-to-br from-info to-info/80 text-white shadow-[0_2px_6px_-1px_rgba(61,122,184,0.5)]',
};

function SectionHeading({
  icon: Icon,
  accent = 'primary',
  children,
}: {
  icon: ComponentType<IconProps>;
  accent?: SectionAccent;
  children: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-md ${SECTION_ACCENT_CLASSES[accent]}`}>
        <Icon size={13} />
      </span>
      <h2 className="text-[13px] font-semibold text-text-primary">{children}</h2>
    </div>
  );
}

/** One report-type row: either an already-attached file (`index` into that type's array) or the always-present trailing "add a file" slot (`entry` undefined). */
interface ReportSlotRow {
  type: string;
  index: number;
  entry?: DocFileEntry;
}

function reportSlotTone(entry: DocFileEntry | undefined, hasError: boolean): BadgeTone {
  if (!entry) return hasError ? 'error' : 'neutral';
  if (entry.state === 'uploaded') return 'success';
  if (entry.state === 'uploading') return 'info';
  if (entry.state === 'error') return 'error';
  return 'warning';
}

function reportSlotLabel(entry: DocFileEntry | undefined, hasError: boolean): string {
  if (!entry) return hasError ? 'Required' : 'Pending';
  if (entry.state === 'uploaded') return 'Uploaded';
  if (entry.state === 'uploading') return 'Uploading…';
  if (entry.state === 'error') return 'Failed';
  return 'Pending';
}

/**
 * Report Upload's table — one row per attached document. A report type shows
 * a single empty slot until its first file is attached; after that, another
 * document is added only by clicking that row's "Add" button (rather than a
 * fresh empty slot opening automatically after every pick), which opens one
 * more empty slot until a file is picked into it. There's no delete — a
 * filled slot offers "Edit" to replace its file only until it is uploaded. Each row uploads for
 * real the moment its own "Upload" button is clicked (status flips Pending ->
 * Uploading -> Uploaded/Failed there), independent of the page's Save action.
 */
function ReportUploadTable({
  docs,
  files,
  onChooseFile,
  onPreview,
  onUpload,
  onAddSlot,
  openSlots,
  emptyMessage,
  missingDocs,
}: {
  docs: string[];
  files: Record<string, DocFileEntry[]>;
  /** Report types whose extra empty slot was opened with "Add". */
  openSlots: Set<string>;
  onAddSlot: (type: string) => void;
  onChooseFile: (type: string, index: number) => void;
  onPreview: (type: string, entry: DocFileEntry) => void;
  onUpload: (type: string, index: number) => void;
  emptyMessage: string;
  /** Report types with no uploaded file, flagged by the last Save attempt. */
  missingDocs?: Set<string>;
}) {
  if (docs.length === 0) {
    return <p className="text-xs text-text-tertiary">{emptyMessage}</p>;
  }

  const rows: ReportSlotRow[] = docs.flatMap((type) => {
    const entries = files[type] ?? [];
    const slots: ReportSlotRow[] = entries.map((entry, index) => ({ type, index, entry }));
    if (entries.length === 0 || openSlots.has(type)) slots.push({ type, index: entries.length });
    return slots;
  });

  const columns: TableColumn<ReportSlotRow>[] = [
    {
      key: 'type',
      header: 'Report',
      width: '160px',
      render: (row) => (row.index === 0 ? <span className="font-medium text-text-primary">{row.type}</span> : null),
    },
    {
      key: 'file',
      header: 'File',
      render: (row) =>
        row.entry ? (
          <button type="button" className="truncate text-xs font-medium text-text-primary hover:underline" onClick={() => onPreview(row.type, row.entry!)}>
            {row.entry.file.name}
          </button>
        ) : (
          <span className="text-xs text-text-tertiary">No file chosen</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      width: '120px',
      render: (row) => {
        const hasError = row.index === 0 && (missingDocs?.has(row.type) ?? false);
        return <Badge tone={reportSlotTone(row.entry, hasError)}>{reportSlotLabel(row.entry, hasError)}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '190px',
      render: (row) => {
        const uploading = row.entry?.state === 'uploading';
        if (!row.entry) {
          return (
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => onChooseFile(row.type, row.index)}>
                Select File
              </Button>
            </div>
          );
        }
        // "Add" opens one more empty slot — only on the type's last row, once it is uploaded.
        const isLastRow = row.index === (files[row.type]?.length ?? 0) - 1 && !openSlots.has(row.type);
        if (row.entry.state === 'uploaded') {
          return (
            <div className="flex justify-end gap-1.5">
              {isLastRow && (
                <Button size="sm" onClick={() => onAddSlot(row.type)}>
                  + Add
                </Button>
              )}
            </div>
          );
        }
        return (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" onClick={() => onUpload(row.type, row.index)} disabled={uploading}>
              Upload
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onChooseFile(row.type, row.index)} disabled={uploading}>
              Edit
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={rows}
      rowKey={(row) => `${row.type}-${row.index}`}
      className="border-divider/70"
    />
  );
}

/**
 * Client information + document upload workflow, shown after "Start" on an
 * appointment. Ported from `ClientInformationScreen`
 * (client_information_screen.dart).
 *
 * Route contract: `appointmentId` (the appointment booking id) comes from
 * the `:appointmentId` route param, `caseId` from the `?caseId=` query
 * string — both `AppointmentsPage` and `UploadReportPage` link here the
 * same way.
 */
export function ClientInformationPage() {
  const navigate = useNavigate();
  const { appointmentId: routeAppointmentId } = useParams<{ appointmentId: string }>();
  const [searchParams] = useSearchParams();
  const caseIdParam = searchParams.get('caseId') ?? '';
  const appointmentIdParam = routeAppointmentId ?? '';

  const [item, setItem] = useState<AppointmentUIModel>(() => emptyItem(caseIdParam, appointmentIdParam));

  const [idProofOptions, setIdProofOptions] = useState<string[]>(FALLBACK_ID_PROOF_OPTIONS);
  const [idProofOptionIds, setIdProofOptionIds] = useState<Record<string, number>>({});
  const [clientPhotoOptions, setClientPhotoOptions] = useState<string[]>(FALLBACK_CLIENT_PHOTO_OPTIONS);
  const [clientPhotoOptionIds, setClientPhotoOptionIds] = useState<Record<string, number>>({});
  const [reportTypeOptions, setReportTypeOptions] = useState<string[]>(FALLBACK_REPORT_TYPE_OPTIONS);
  const [reportTypeOptionIds, setReportTypeOptionIds] = useState<Record<string, number>>({});
  const [reportTypeLoadError, setReportTypeLoadError] = useState<string | null>(null);

  const [selectedIdProofs, setSelectedIdProofs] = useState<Set<string>>(new Set());
  const [selectedClientPhotos, setSelectedClientPhotos] = useState<Set<string>>(new Set());
  const [docFiles, setDocFiles] = useState<Record<string, DocFileEntry>>({});
  /**
   * Report Upload lists every report type as its own row (no selection
   * step), but — unlike ID Proof/Client Photo — each type can hold several
   * documents at once, so it's keyed to arrays.
   */
  const [reportDocFiles, setReportDocFiles] = useState<Record<string, DocFileEntry[]>>({});
  /** Report types whose extra empty slot is open (after clicking "Add"). */
  const [openReportSlots, setOpenReportSlots] = useState<Set<string>>(new Set());

  const [remark, setRemark] = useState('');
  const [remarkError, setRemarkError] = useState(false);

  /** Selected doc types missing an UPLOADED file — flagged on save attempt, cleared once fixed or the form is cleared. */
  const [missingIdProofs, setMissingIdProofs] = useState<Set<string>>(new Set());
  const [missingClientPhotos, setMissingClientPhotos] = useState<Set<string>>(new Set());
  /** Report types with no uploaded file — every report type is required, unlike ID Proof/Client Photo which are only required once selected. */
  const [missingReportUploads, setMissingReportUploads] = useState<Set<string>>(new Set());
  /** At least one ID Proof / Client Photo type must be picked via "+ Add" before Save — flagged on save attempt, cleared once fixed or the form is cleared. */
  const [idProofSelectionError, setIdProofSelectionError] = useState(false);
  const [clientPhotoSelectionError, setClientPhotoSelectionError] = useState(false);

  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /** Types whose document already exists on the server — pre-selected and locked in the "+ Add" pickers. */
  const [existingIdProofs, setExistingIdProofs] = useState<Set<string>>(new Set());
  const [existingClientPhotos, setExistingClientPhotos] = useState<Set<string>>(new Set());
  /** How many of the three dropdown lookups have finished (success or not) — existing documents are matched to them afterwards. */
  const [optionsSettled, setOptionsSettled] = useState(0);

  const { pickClientPhoto, pickIdProof, pickerUi } = useGeoDocumentPicker();
  /** True while a document is being sent to the server — drives the blocking loader. */
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  useEffect(() => {
    const appointmentId = Number(appointmentIdParam);
    const caseId = Number(caseIdParam);
    if (!Number.isFinite(appointmentId) && !Number.isFinite(caseId)) return;
    let cancelled = false;
    getAppointmentDetailsById(Number.isFinite(caseId) ? caseId : undefined, Number.isFinite(appointmentId) ? appointmentId : undefined)
      .then((details) => {
        if (cancelled) return;
        const mapped = mapAppointmentDetailsToModels(details);
        if (mapped.length > 0) setItem(mapped[0]);
      })
      .catch(() => {
        // Keep showing the placeholder built from route params.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentIdParam, caseIdParam]);

  useEffect(() => {
    let cancelled = false;
    getIdProofDropdown()
      .then((options) => {
        if (cancelled) return;
        setIdProofOptions(options.map((o) => o.label));
        setIdProofOptionIds(toOptionIdMap(options));
      })
      .catch(() => {
        // Keep the static fallback.
      })
      .finally(() => setOptionsSettled((n) => n + 1));
    getClientPhotoDropdown()
      .then((options) => {
        if (cancelled) return;
        setClientPhotoOptions(options.map((o) => o.label));
        setClientPhotoOptionIds(toOptionIdMap(options));
      })
      .catch(() => {
        // Keep the static fallback.
      })
      .finally(() => setOptionsSettled((n) => n + 1));
    getDCReportDropdown()
      .then((options) => {
        if (cancelled) return;
        setReportTypeOptions(options.map((o) => o.label));
        setReportTypeOptionIds(toOptionIdMap(options));
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Report type options are not available right now.';
        setReportTypeLoadError(message);
        toast.error(message);
      })
      .finally(() => setOptionsSettled((n) => n + 1));
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Once the type lists are in, read the documents already uploaded for this
   * appointment (`GetReportUploadViewDocument`) and pre-fill each matching
   * type as "Uploaded" — so it shows View/Edit instead of Select File/Upload,
   * and stays selected in the "+ Add" picker.
   */
  useEffect(() => {
    if (optionsSettled < 3) return;
    const caseId = Number(caseIdParam);
    const appointmentId = Number(appointmentIdParam);
    if (!Number.isFinite(caseId) || !Number.isFinite(appointmentId)) return;
    let cancelled = false;

    async function loadExisting() {
      try {
        const cached = (getUserData() ?? {}) as Record<string, unknown>;
        const cachedRow = flattenProfileEnvelope(cached);
        const dcProviderId = pick(cachedRow, 'ProviderNumber', 'providerNumber', 'provider_number') ?? '';
        if (!dcProviderId) return;
        const all = await getReportUploadViewDocuments(String(dcProviderId));
        if (cancelled) return;
        const documents = filterDocumentsByCaseAppointment(all, caseId, appointmentId);
        if (documents.length === 0) return;

        const matchLabel = (ids: Record<string, number>, options: string[], doc: ReportUploadDocument): string | null => {
          const id = doc.documentTypeId;
          if (id) {
            const byId = Object.entries(ids).find(([, value]) => value === id);
            if (byId) return byId[0];
          }
          const name = (doc.documentType ?? '').trim().toLowerCase();
          return name ? (options.find((o) => o.trim().toLowerCase() === name) ?? null) : null;
        };
        const entryOf = (doc: ReportUploadDocument): DocFileEntry => ({
          // No local bytes for an existing document — the File is just a name placeholder.
          file: new File([], doc.fileName ?? 'Document'),
          state: 'uploaded',
          remoteUrl: doc.fileWebPath,
          reportUploadId: doc.reportUploadId,
        });

        const nextFiles: Record<string, DocFileEntry> = {};
        const nextReports: Record<string, DocFileEntry[]> = {};
        const proofs = new Set<string>();
        const photos = new Set<string>();
        for (const doc of documents) {
          const proof = matchLabel(idProofOptionIds, idProofOptions, doc);
          const photo = matchLabel(clientPhotoOptionIds, clientPhotoOptions, doc);
          const report = matchLabel(reportTypeOptionIds, reportTypeOptions, doc);
          if (proof) {
            nextFiles[proof] ??= entryOf(doc);
            proofs.add(proof);
          } else if (photo) {
            nextFiles[photo] ??= entryOf(doc);
            photos.add(photo);
          } else if (report) {
            (nextReports[report] ??= []).push(entryOf(doc));
          }
        }

        setDocFiles((prev) => ({ ...nextFiles, ...prev }));
        setReportDocFiles((prev) => {
          const merged = { ...prev };
          for (const [type, entries] of Object.entries(nextReports)) merged[type] = [...entries, ...(prev[type] ?? [])];
          return merged;
        });
        setExistingIdProofs(proofs);
        setExistingClientPhotos(photos);
        setSelectedIdProofs((prev) => new Set([...prev, ...proofs]));
        setSelectedClientPhotos((prev) => new Set([...prev, ...photos]));
      } catch {
        // Fall back to the empty form.
      }
    }
    void loadExisting();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsSettled]);

  function toOptionIdMap(options: DdlOptionModel[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const option of options) {
      const parsed = Number(option.value);
      map[option.label] = Number.isFinite(parsed) ? parsed : 0;
    }
    return map;
  }

  /**
   * Sends one staged file to the server, called once per file from
   * `handleSaveAll` once Save is pressed. Silent on success/failure —
   * `handleSaveAll` aggregates results across every file.
   */
  async function uploadDocument(params: {
    file: File;
    documentTypeId?: number;
    documentTypeName?: string;
    remark?: string;
    /** The server row of an already-uploaded document — replaces it instead of inserting another. */
    reportUploadId?: number;
    onSuccess: (reportUploadId?: number) => void;
    onFailure: () => void;
  }): Promise<boolean> {
    const caseId = Number(item.caseId);
    const appointmentId = Number(item.appointmentId);
    if (!Number.isFinite(caseId) || !Number.isFinite(appointmentId)) {
      params.onFailure();
      return false;
    }
    try {
      if (params.reportUploadId != null) {
        await updateReportDocument({
          reportUploadId: params.reportUploadId,
          caseId,
          appointmentId,
          documentTypeId: params.documentTypeId,
          documentTypeName: params.documentTypeName,
          icName: item.insuranceCompany,
          file: params.file,
        });
        params.onSuccess(params.reportUploadId);
        return true;
      }
      const response = await uploadReportDocument({
        caseId,
        appointmentId,
        documentTypeId: params.documentTypeId,
        documentTypeName: params.documentTypeName,
        icName: item.insuranceCompany,
        file: params.file,
        remark: params.remark,
        isNew: false,
      });
      params.onSuccess(uploadedReportId(response));
      return true;
    } catch {
      params.onFailure();
      return false;
    }
  }

  /** Just stages the chosen file locally — nothing is sent until its row's own "Upload" button is clicked. */
  async function handlePickDoc(doc: string, isClientPhoto: boolean) {
    // Client Photo: camera only. ID Proof: camera, gallery or PDF. Images are geo-tagged.
    const file = isClientPhoto ? await pickClientPhoto() : await pickIdProof();
    if (!file) return;
    setDocFiles((prev) => ({
      ...prev,
      // Editing an existing document replaces its row rather than adding another.
      [doc]: { file, state: 'pending', reportUploadId: prev[doc]?.reportUploadId },
    }));
    setMissingIdProofs((prev) => {
      if (!prev.has(doc)) return prev;
      const next = new Set(prev);
      next.delete(doc);
      return next;
    });
    setMissingClientPhotos((prev) => {
      if (!prev.has(doc)) return prev;
      const next = new Set(prev);
      next.delete(doc);
      return next;
    });
  }

  function setDocFileState(doc: string, state: DocFileEntry['state'], reportUploadId?: number) {
    setDocFiles((prev) => {
      const entry = prev[doc];
      if (!entry) return prev;
      // A freshly picked file no longer lives at the old remote URL.
      return { ...prev, [doc]: { ...entry, state, reportUploadId: reportUploadId ?? entry.reportUploadId } };
    });
  }

  /** "Upload" only keeps the ID Proof/Client Photo file locally; the final Save sends it to the server. */
  function handleUploadDoc(doc: string) {
    setDocFiles((prev) => (prev[doc] ? { ...prev, [doc]: { ...prev[doc], state: 'uploaded', dirty: true } } : prev));
  }

  function setReportFileState(type: string, index: number, state: DocFileEntry['state'], reportUploadId?: number) {
    setReportDocFiles((prev) => ({
      ...prev,
      [type]: (prev[type] ?? []).map((e, i) =>
        i === index ? { ...e, state, reportUploadId: reportUploadId ?? e.reportUploadId } : e,
      ),
    }));
  }

  /**
   * Picks a file for one report-type slot. `index` at the current array
   * length fills the trailing empty slot (the first one, or the one opened by
   * "Add"). Any other `index` is an existing row's "Edit" — it replaces that
   * row's file in place and resets its status back to pending.
   */
  async function handleChooseReportFile(type: string, index: number) {
    const file = await pickFile();
    if (!file) return;
    setReportDocFiles((prev) => {
      const arr = [...(prev[type] ?? [])];
      const fillsTrailingSlot = index >= arr.length;
      arr[index] = { file, state: 'pending', reportUploadId: arr[index]?.reportUploadId };
      if (fillsTrailingSlot) {
        // That extra slot is now filled — back to showing "Add" instead of an already-open empty slot.
        setOpenReportSlots((open) => {
          if (!open.has(type)) return open;
          const next = new Set(open);
          next.delete(type);
          return next;
        });
      }
      return { ...prev, [type]: arr };
    });
    setMissingReportUploads((prev) => {
      if (!prev.has(type)) return prev;
      const next = new Set(prev);
      next.delete(type);
      return next;
    });
  }

  /** "Upload" only keeps the report file locally; the final Save sends it to the server. */
  function handleUploadReportFile(type: string, index: number) {
    setReportDocFiles((prev) => ({
      ...prev,
      [type]: (prev[type] ?? []).map((e, i) => (i === index ? { ...e, state: 'uploaded', dirty: true } : e)),
    }));
  }

  function toggleIdProof(option: string, checked: boolean) {
    setSelectedIdProofs((prev) => {
      const next = new Set(prev);
      if (checked) next.add(option);
      else if (!existingIdProofs.has(option)) next.delete(option);
      if (next.size > 0) setIdProofSelectionError(false);
      return next;
    });
  }

  function toggleClientPhoto(option: string, checked: boolean) {
    setSelectedClientPhotos((prev) => {
      const next = new Set(prev);
      if (checked) next.add(option);
      else if (!existingClientPhotos.has(option)) next.delete(option);
      if (next.size > 0) setClientPhotoSelectionError(false);
      return next;
    });
  }

  function openPreview(label: string, entry: DocFileEntry | undefined) {
    setPreviewLabel(label);
    // An already-uploaded document has no local bytes — preview it from its URL.
    setPreviewFile(entry?.remoteUrl ? null : (entry?.file ?? null));
    setPreviewUrl(entry?.remoteUrl ?? null);
  }

  /**
   * Validates the whole form before saving anything, including the remark:
   * at least one ID Proof type and at least one Client Photo type must be
   * picked (via "+ Add"); every picked ID Proof/Client Photo type and every
   * Report Upload type must already have a file with status "Uploaded" —
   * via each row's own "Upload" button, not just picked — and the remark
   * must be non-empty. Save is a pure gate: it never uploads anything
   * itself, so nothing is saved (not even the remark) until all of that is
   * already done. Only once every check passes does it confirm success and
   * clear the form.
   */
  async function handleSaveAll() {
    const idProofEmpty = selectedIdProofs.size === 0;
    const clientPhotoEmpty = selectedClientPhotos.size === 0;
    const missingIdProofsNow = new Set(
      [...selectedIdProofs].filter((doc) => docFiles[doc]?.state !== 'uploaded'),
    );
    const missingClientPhotosNow = new Set(
      [...selectedClientPhotos].filter((doc) => docFiles[doc]?.state !== 'uploaded'),
    );
    const missingReportUploadsNow = new Set(
      reportTypeOptions.filter((type) => !(reportDocFiles[type] ?? []).some((entry) => entry.state === 'uploaded')),
    );
    const remarkEmpty = remark.trim().length === 0;

    setIdProofSelectionError(idProofEmpty);
    setClientPhotoSelectionError(clientPhotoEmpty);
    setMissingIdProofs(missingIdProofsNow);
    setMissingClientPhotos(missingClientPhotosNow);
    setMissingReportUploads(missingReportUploadsNow);
    setRemarkError(remarkEmpty);

    if (
      idProofEmpty ||
      clientPhotoEmpty ||
      missingIdProofsNow.size > 0 ||
      missingClientPhotosNow.size > 0 ||
      missingReportUploadsNow.size > 0 ||
      remarkEmpty
    ) {
      const messages = [
        idProofEmpty ? 'Select at least one ID Proof type.' : null,
        clientPhotoEmpty ? 'Select at least one Client Photo type.' : null,
        missingIdProofsNow.size > 0 ? `Upload a document for: ${[...missingIdProofsNow].join(', ')}.` : null,
        missingClientPhotosNow.size > 0 ? `Upload a document for: ${[...missingClientPhotosNow].join(', ')}.` : null,
        missingReportUploadsNow.size > 0 ? `Upload a document for: ${[...missingReportUploadsNow].join(', ')}.` : null,
        remarkEmpty ? 'Remark is required.' : null,
      ].filter(Boolean);
      toast.error(messages.join(' '));
      return;
    }

    const caseId = Number(item.caseId);
    const appointmentId = Number(item.appointmentId);
    if (!Number.isFinite(caseId) || !Number.isFinite(appointmentId)) {
      toast.error('Could not save the remark.');
      return;
    }
    setIsUploadingDoc(true);
    try {
      // Send every document that was only kept locally by its "Upload" button.
      const failed: string[] = [];
      const idProofOrPhotoDocs = Object.entries(docFiles).filter(([, entry]) => entry.dirty);
      for (const [doc, entry] of idProofOrPhotoDocs) {
        const ok = await uploadDocument({
          file: entry.file,
          documentTypeId: idProofOptionIds[doc] ?? clientPhotoOptionIds[doc],
          documentTypeName: doc,
          remark: remark.trim(),
          reportUploadId: entry.reportUploadId,
          onSuccess: (id) =>
            setDocFiles((prev) => ({
              ...prev,
              [doc]: { ...prev[doc], dirty: false, reportUploadId: id ?? prev[doc].reportUploadId },
            })),
          onFailure: () => undefined,
        });
        if (!ok) failed.push(doc);
      }
      for (const [type, entries] of Object.entries(reportDocFiles)) {
        for (let index = 0; index < entries.length; index++) {
          const entry = entries[index];
          if (!entry.dirty) continue;
          const ok = await uploadDocument({
            file: entry.file,
            documentTypeId: reportTypeOptionIds[type],
            documentTypeName: type,
            remark: remark.trim(),
            reportUploadId: entry.reportUploadId,
            onSuccess: (id) =>
              setReportDocFiles((prev) => ({
                ...prev,
                [type]: (prev[type] ?? []).map((e, i) =>
                  i === index ? { ...e, dirty: false, reportUploadId: id ?? e.reportUploadId } : e,
                ),
              })),
            onFailure: () => undefined,
          });
          if (!ok) failed.push(type);
        }
      }
      if (failed.length > 0) {
        toast.error(`Failed to upload: ${failed.join(', ')}. Please try Save again.`);
        return;
      }

      try {
        await updateReportRemark(caseId, appointmentId, remark.trim());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save the remark. Please try again.');
        return;
      }
    } finally {
      setIsUploadingDoc(false);
    }

    toast.success('Details saved successfully');
    // Report Upload is now done for this case — go back to wherever this
    // page was opened from (the Appointments list, or the Report Upload
    // queue) so it remounts and refetches, dropping this case from a
    // pending queue.
    navigate(-1);
  }

  const infoFields = useMemo(
    () => [
      { label: 'Case ID', value: item.caseId },
      { label: 'Appointment Id', value: item.appointmentId },
      { label: 'Client Name', value: item.patientName },
      { label: 'Insurance Company', value: item.insuranceCompany },
      { label: 'Proposal Number', value: item.proposalNo },
      { label: 'Gender', value: item.gender },
      { label: 'Contact Number', value: item.mobileNo },
      { label: 'DC Name', value: item.dcName },
      { label: 'Appointment Date', value: formatDate(item.date, 'dd-MM-yyyy') },
      { label: 'DOB', value: formatDobValue(item.dob) },
    ],
    [item],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Client Information"
        description={item.patientName ? `${item.patientName} · Case ${item.caseId || '—'}` : 'Identity, report and remark for this appointment.'}
      />

      {/* Info grid */}
      <Card>
        <SectionHeading icon={IconBadge} accent="primary">Appointment Details</SectionHeading>
        <div className="mt-3.5 grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {infoFields.map((field) => (
            <div key={field.label} className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{field.label}</p>
              <p className={`mt-0.5 truncate text-[13px] font-medium ${field.value ? 'text-text-primary' : 'text-text-tertiary'}`}>
                {field.value || '—'}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Identity proof + client photo — side by side, each a "+ Add" menu over its table. */}
      <Card>
        <SectionHeading icon={IconBadge} accent="accent">Identity Proof</SectionHeading>
        <div className="mt-3.5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="min-w-0">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-text-primary">ID Proof</h3>
              <AddTypeMenu
                label="ID Proof"
                options={idProofOptions}
                selected={selectedIdProofs}
                onToggle={toggleIdProof}
                locked={existingIdProofs}
              />
            </div>
            <DocumentStatusTable
              columnLabel="ID Proof"
              docs={idProofOptions.filter((o) => selectedIdProofs.has(o))}
              files={docFiles}
              missingDocs={missingIdProofs}
              onChooseFile={(doc) => void handlePickDoc(doc, false)}
              onUpload={(doc) => void handleUploadDoc(doc)}
              onPreview={(doc) => openPreview(doc, docFiles[doc])}
              emptyMessage="Select one or more ID Proof types above."
            />
            {idProofSelectionError && (
              <p className="mt-1.5 text-xs font-semibold text-error">Select at least one ID Proof type.</p>
            )}
          </div>

          <div className="min-w-0">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-text-primary">Client Photo</h3>
              <AddTypeMenu
                label="Client Photo"
                options={clientPhotoOptions}
                selected={selectedClientPhotos}
                onToggle={toggleClientPhoto}
                locked={existingClientPhotos}
              />
            </div>
            <DocumentStatusTable
              columnLabel="Client Photo"
              docs={clientPhotoOptions.filter((o) => selectedClientPhotos.has(o))}
              files={docFiles}
              missingDocs={missingClientPhotos}
              onChooseFile={(doc) => void handlePickDoc(doc, true)}
              onUpload={(doc) => void handleUploadDoc(doc)}
              onPreview={(doc) => openPreview(doc, docFiles[doc])}
              emptyMessage="Select one or more Client Photo types above."
            />
            {clientPhotoSelectionError && (
              <p className="mt-1.5 text-xs font-semibold text-error">Select at least one Client Photo type.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Report upload — bound to `GetDCReport`; every report type is its own row (no selection
          step, unlike Identity Proof/Client Photo), so each uploaded file carries a proper
          `documentTypeId`. Each row uploads for real via its own Upload button, independent of
          the page's Save action below. */}
      <Card>
        <SectionHeading icon={IconFileUp} accent="appointment-accent">Report Upload</SectionHeading>
        {reportTypeLoadError && <p className="mt-2 text-xs font-medium text-error">Report types unavailable.</p>}
        <div className="mt-3.5">
          {reportTypeOptions.length === 0 && !reportTypeLoadError ? (
            <span className="flex items-center gap-2 px-1 py-1 text-xs text-text-tertiary">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-divider border-t-primary" />
              Loading report types...
            </span>
          ) : (
            <ReportUploadTable
              docs={reportTypeOptions}
              files={reportDocFiles}
              missingDocs={missingReportUploads}
              openSlots={openReportSlots}
              onAddSlot={(type) => setOpenReportSlots((prev) => new Set(prev).add(type))}
              onChooseFile={(type, index) => void handleChooseReportFile(type, index)}
              onUpload={(type, index) => void handleUploadReportFile(type, index)}
              onPreview={(type, entry) => openPreview(`${type} — ${entry.file.name}`, entry)}
              emptyMessage="No report types available."
            />
          )}
        </div>
      </Card>

      {/* Remark */}
      <Card>
        <div className="flex items-center gap-1">
          <SectionHeading icon={IconInfo} accent="info">Remark</SectionHeading>
          <span className="text-[13px] font-semibold text-error">*</span>
        </div>
        <div className="mt-2.5">
          <Textarea
            value={remark}
            onChange={(e) => {
              setRemark(e.target.value);
              if (remarkError && e.target.value.trim()) setRemarkError(false);
            }}
            rows={4}
            placeholder="Add a remark (e.g. what was fixed / re-uploaded)..."
            error={remarkError ? 'Remark is required.' : undefined}
          />
          {remarkError && <p className="mt-1 text-xs font-semibold text-error">Remark is required.</p>}
        </div>
      </Card>

      {/* Save is a pure validation gate — it doesn't upload anything itself. Every ID Proof/Client
          Photo/Report Upload document must already show "Uploaded" (via its own row's Upload
          button) and the remark must be filled in, or Save blocks with an error and saves
          nothing — not even the remark. */}
      <Card>
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-text-secondary">
            Every document above must be uploaded (via its own row's Upload button) before you can
            save.
          </p>
          <Button variant="primary" onClick={() => void handleSaveAll()}>
            Save
          </Button>
        </div>
      </Card>

      <DocumentPreviewModal
        label={previewLabel}
        file={previewFile}
        imageUrl={previewUrl}
        openUrl={previewUrl}
        fileName={previewFile?.name}
        onClose={() => setPreviewLabel(null)}
      />
      {pickerUi}
      {isUploadingDoc && <LoadingOverlay message="Saving documents..." />}
    </div>
  );
}
