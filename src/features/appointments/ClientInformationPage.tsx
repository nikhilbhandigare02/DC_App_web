import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'react-router-dom';
import { getAppointmentDetailsById } from '../../api/appointmentApi';
import { getClientPhotoDropdown, getDCReportDropdown, getIdProofDropdown, uploadReportDocument } from '../../api/reportUploadApi';
import type { DdlOptionModel } from '../../types/ddl';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Table, type TableColumn } from '../../components/ui/Table';
import { toast } from '../../lib/toast';
import { IconBadge, IconClose, IconFileUp, IconInfo, IconMaximize, IconMinimize } from '../../components/icons';
import type { IconProps } from '../../components/icons';
import { DocumentStatusTable, type DocFileEntry } from './components/DocumentStatusTable';
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

function isImageFile(file: File): boolean {
  return /\.(jpg|jpeg|png)$/i.test(file.name);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

/**
 * "+ Add {label}" pill that opens a small checklist popover — the trigger
 * for picking which ID Proof / Client Photo types show a row in the table
 * below. Closes on an outside click, same pattern as `HomeLayout`'s avatar
 * menu.
 *
 * The panel is portaled to `document.body` and positioned with `fixed`
 * coordinates measured from the button — `Card` (its natural parent here)
 * sets `overflow-hidden` for its rounded corners, which would otherwise clip
 * the panel wherever it crosses the card's edge into the next section.
 */
function AddTypeMenu({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (option: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    // Capture-phase scroll listener: closes the panel instead of leaving it
    // misaligned with the button once anything under it scrolls, since a
    // `fixed`-positioned panel doesn't move along with page content.
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-accent/40 px-3 py-1.5 text-[12.5px] font-semibold text-accent-dark transition-colors hover:bg-accent-pale/40"
      >
        + Add {label}
      </button>
      {open && position
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: position.top, right: position.right }}
              className="fixed z-[200] max-h-64 w-56 overflow-y-auto rounded-lg border border-divider bg-surface p-1.5 shadow-lg"
            >
              {options.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-text-tertiary">No options available.</p>
              ) : (
                options.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-variant"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(option)}
                      onChange={(e) => onToggle(option, e.target.checked)}
                      className="h-3.5 w-3.5 shrink-0 rounded border-divider text-primary accent-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-[13px] text-text-primary">{option}</span>
                  </label>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </>
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
 * Report Upload's table — one row per attached document, plus an always-
 * present trailing empty slot per report type for adding the next one.
 * Selecting a file on that trailing slot both fills it in and appends a
 * fresh empty slot below it; there's no delete — a filled slot only offers
 * "Edit" to replace its file. Each row uploads for real the moment its own
 * "Upload" button is clicked (status flips Pending -> Uploading -> Uploaded/
 * Failed there), independent of the page's Save action.
 */
function ReportUploadTable({
  docs,
  files,
  onChooseFile,
  onPreview,
  onUpload,
  emptyMessage,
  missingDocs,
}: {
  docs: string[];
  files: Record<string, DocFileEntry[]>;
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
    slots.push({ type, index: entries.length });
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
        if (row.entry.state === 'uploaded') {
          return (
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => onChooseFile(row.type, row.index)}>
                Edit
              </Button>
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

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

/**
 * Document preview overlay — an image gets zoom controls (+/-, wheel-free,
 * reset on open) and a full screen / minimize toggle; a non-image file falls
 * back to a name/size card, same as before. Portaled to `document.body` for
 * the same reason `Modal`/`Drawer` are (a `Card` ancestor's `overflow-hidden`
 * would otherwise clip it, and a page-wrapper animation elsewhere would clip
 * it to less than the full viewport — see those components' own notes).
 */
function DocumentPreviewModal({
  label,
  file,
  onClose,
}: {
  label: string | null;
  file: File | null;
  onClose: () => void;
}) {
  const open = label !== null;
  const [zoom, setZoom] = useState(1);
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setFullScreen(false);
    }
  }, [open, file]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (!open) return null;

  const isImage = file ? isImageFile(file) : false;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex flex-col overflow-hidden rounded-lg border border-divider bg-surface shadow-xl ${
          fullScreen ? 'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]' : 'max-h-[85vh] w-full max-w-[420px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-divider bg-gradient-to-r from-primary-pale/50 via-transparent to-transparent px-4 py-3">
          <h2 className="truncate text-[14px] font-semibold text-text-primary">{label}</h2>
          <div className="flex shrink-0 items-center gap-1">
            {isImage && (
              <>
                <button
                  type="button"
                  aria-label="Zoom out"
                  disabled={zoom <= ZOOM_MIN}
                  onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[15px] font-bold text-text-secondary hover:bg-surface-variant hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-10 text-center text-xs font-semibold text-text-tertiary">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  aria-label="Zoom in"
                  disabled={zoom >= ZOOM_MAX}
                  onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[15px] font-bold text-text-secondary hover:bg-surface-variant hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
                <span className="mx-1 h-4 w-px bg-divider" />
              </>
            )}
            <button
              type="button"
              aria-label={fullScreen ? 'Exit full screen' : 'Full screen'}
              onClick={() => setFullScreen((f) => !f)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-variant hover:text-text-primary"
            >
              {fullScreen ? <IconMinimize size={15} /> : <IconMaximize size={15} />}
            </button>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-variant hover:text-text-primary"
            >
              <IconClose size={16} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-surface-variant">
          {isImage && objectUrl ? (
            <div className="flex min-h-full items-center justify-center p-4">
              <img
                src={objectUrl}
                alt={label ?? ''}
                className="max-w-none rounded-md transition-transform duration-150 ease-out"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 px-4 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.6">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6" />
              </svg>
              <p className="truncate text-[12.5px] font-medium text-text-secondary">{file?.name ?? 'Preview unavailable'}</p>
              {file && <p className="text-[11px] text-text-tertiary">{formatFileSize(file.size)}</p>}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
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
      });
    getClientPhotoDropdown()
      .then((options) => {
        if (cancelled) return;
        setClientPhotoOptions(options.map((o) => o.label));
        setClientPhotoOptionIds(toOptionIdMap(options));
      })
      .catch(() => {
        // Keep the static fallback.
      });
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
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toOptionIdMap(options: DdlOptionModel[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const option of options) {
      const parsed = Number(option.value);
      map[option.label] = Number.isFinite(parsed) ? parsed : 0;
    }
    return map;
  }

  /**
   * Uploads one staged file, called once per file from `handleSaveAll` once
   * Save is pressed. Silent on success/failure — `handleSaveAll` aggregates
   * results across every file and reports them in one toast.
   */
  async function uploadDocument(params: {
    file: File;
    documentTypeId?: number;
    documentTypeName?: string;
    remark?: string;
    onSuccess: () => void;
    onFailure: () => void;
  }): Promise<boolean> {
    const caseId = Number(item.caseId);
    const appointmentId = Number(item.appointmentId);
    if (!Number.isFinite(caseId) || !Number.isFinite(appointmentId)) {
      params.onFailure();
      return false;
    }
    try {
      await uploadReportDocument({
        caseId,
        appointmentId,
        documentTypeId: params.documentTypeId,
        documentTypeName: params.documentTypeName,
        icName: item.insuranceCompany,
        file: params.file,
        remark: params.remark,
      });
      params.onSuccess();
      return true;
    } catch {
      params.onFailure();
      return false;
    }
  }

  /** Just stages the chosen file locally — nothing is sent until its row's own "Upload" button is clicked. */
  async function handlePickDoc(doc: string) {
    const file = await pickFile();
    if (!file) return;
    setDocFiles((prev) => ({ ...prev, [doc]: { file, state: 'pending' } }));
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

  function setDocFileState(doc: string, state: DocFileEntry['state']) {
    setDocFiles((prev) => {
      const entry = prev[doc];
      if (!entry) return prev;
      return { ...prev, [doc]: { ...entry, state } };
    });
  }

  /** Uploads one ID Proof/Client Photo row's file for real, independent of the page's Save action. */
  async function handleUploadDoc(doc: string) {
    const entry = docFiles[doc];
    if (!entry) return;
    setDocFileState(doc, 'uploading');
    const ok = await uploadDocument({
      file: entry.file,
      documentTypeId: idProofOptionIds[doc] ?? clientPhotoOptionIds[doc],
      documentTypeName: doc,
      remark: remark.trim(),
      onSuccess: () => setDocFileState(doc, 'uploaded'),
      onFailure: () => setDocFileState(doc, 'error'),
    });
    if (ok) {
      toast.success(`${doc} document uploaded successfully`);
    } else {
      toast.error(`Failed to upload the ${doc} document.`);
    }
  }

  function setReportFileState(type: string, index: number, state: DocFileEntry['state']) {
    setReportDocFiles((prev) => ({
      ...prev,
      [type]: (prev[type] ?? []).map((e, i) => (i === index ? { ...e, state } : e)),
    }));
  }

  /**
   * Picks a file for one report-type slot. `index` at the current array
   * length fills the trailing "add a file" slot, which both attaches the
   * file there and (via the extra slot `ReportUploadTable` always renders
   * past the array's end) makes a fresh empty slot appear below it. Any
   * other `index` is an existing row's "Edit" — it replaces that row's file
   * in place and resets its status back to pending.
   */
  async function handleChooseReportFile(type: string, index: number) {
    const file = await pickFile();
    if (!file) return;
    setReportDocFiles((prev) => {
      const arr = [...(prev[type] ?? [])];
      arr[index] = { file, state: 'pending' };
      return { ...prev, [type]: arr };
    });
    setMissingReportUploads((prev) => {
      if (!prev.has(type)) return prev;
      const next = new Set(prev);
      next.delete(type);
      return next;
    });
  }

  /** Uploads one report row's file for real, independent of the page's Save action. */
  async function handleUploadReportFile(type: string, index: number) {
    const entry = reportDocFiles[type]?.[index];
    if (!entry) return;
    setReportFileState(type, index, 'uploading');
    const ok = await uploadDocument({
      file: entry.file,
      documentTypeId: reportTypeOptionIds[type],
      documentTypeName: type,
      remark: remark.trim(),
      onSuccess: () => setReportFileState(type, index, 'uploaded'),
      onFailure: () => setReportFileState(type, index, 'error'),
    });
    if (ok) {
      toast.success(`${type} document uploaded successfully`);
    } else {
      toast.error(`Failed to upload the ${type} document.`);
    }
  }

  function toggleIdProof(option: string, checked: boolean) {
    setSelectedIdProofs((prev) => {
      const next = new Set(prev);
      if (checked) next.add(option);
      else next.delete(option);
      if (next.size > 0) setIdProofSelectionError(false);
      return next;
    });
  }

  function toggleClientPhoto(option: string, checked: boolean) {
    setSelectedClientPhotos((prev) => {
      const next = new Set(prev);
      if (checked) next.add(option);
      else next.delete(option);
      if (next.size > 0) setClientPhotoSelectionError(false);
      return next;
    });
  }

  function openPreview(label: string, file: File | undefined) {
    setPreviewLabel(label);
    setPreviewFile(file ?? null);
  }

  /** Resets every section (Identity Proof, Client Photo, Report Upload, Remark) back to its initial empty state. */
  function clearForm() {
    setSelectedIdProofs(new Set());
    setSelectedClientPhotos(new Set());
    setDocFiles({});
    setReportDocFiles({});
    setRemark('');
    setRemarkError(false);
    setMissingIdProofs(new Set());
    setMissingClientPhotos(new Set());
    setMissingReportUploads(new Set());
    setIdProofSelectionError(false);
    setClientPhotoSelectionError(false);
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
  function handleSaveAll() {
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

    toast.success('Details saved successfully');
    clearForm();
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
              <AddTypeMenu label="ID Proof" options={idProofOptions} selected={selectedIdProofs} onToggle={toggleIdProof} />
            </div>
            <DocumentStatusTable
              columnLabel="ID Proof"
              docs={idProofOptions.filter((o) => selectedIdProofs.has(o))}
              files={docFiles}
              missingDocs={missingIdProofs}
              onChooseFile={(doc) => void handlePickDoc(doc)}
              onUpload={(doc) => void handleUploadDoc(doc)}
              onPreview={(doc) => openPreview(doc, docFiles[doc]?.file)}
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
              />
            </div>
            <DocumentStatusTable
              columnLabel="Client Photo"
              docs={clientPhotoOptions.filter((o) => selectedClientPhotos.has(o))}
              files={docFiles}
              missingDocs={missingClientPhotos}
              onChooseFile={(doc) => void handlePickDoc(doc)}
              onUpload={(doc) => void handleUploadDoc(doc)}
              onPreview={(doc) => openPreview(doc, docFiles[doc]?.file)}
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
              onChooseFile={(type, index) => void handleChooseReportFile(type, index)}
              onUpload={(type, index) => void handleUploadReportFile(type, index)}
              onPreview={(type, entry) => openPreview(`${type} — ${entry.file.name}`, entry.file)}
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
          <Button variant="primary" onClick={handleSaveAll}>
            Save
          </Button>
        </div>
      </Card>

      <DocumentPreviewModal label={previewLabel} file={previewFile} onClose={() => setPreviewLabel(null)} />
    </div>
  );
}
