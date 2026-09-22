import { Table, type TableColumn } from '../../../components/ui/Table';
import { Badge, type BadgeTone } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export type DocUploadState = 'pending' | 'uploading' | 'uploaded' | 'error';

export interface DocFileEntry {
  file: File;
  state: DocUploadState;
}

interface DocumentStatusTableProps {
  columnLabel: string;
  docs: string[];
  files: Record<string, DocFileEntry>;
  /** Opens a file picker and stages the chosen file locally (replacing whatever was there before) — nothing is uploaded yet. */
  onChooseFile: (doc: string) => void;
  /** Uploads the staged file for real; only relevant once a file has been chosen. */
  onUpload: (doc: string) => void;
  onPreview: (doc: string) => void;
  /** Docs selected but missing a staged file, flagged by the last Save attempt. */
  missingDocs?: Set<string>;
  /** Shown in place of the table when `docs` is empty (defaults to "No {columnLabel} selected."). */
  emptyMessage?: string;
}

interface DocRow {
  doc: string;
  entry?: DocFileEntry;
  hasError: boolean;
}

function statusTone(row: DocRow): BadgeTone {
  if (row.entry?.state === 'uploaded') return 'success';
  if (row.entry?.state === 'uploading') return 'info';
  if (row.entry?.state === 'error') return 'error';
  if (row.entry?.state === 'pending') return 'neutral';
  return row.hasError ? 'error' : 'warning';
}

function statusLabel(row: DocRow): string {
  if (row.entry?.state === 'uploaded') return 'Uploaded';
  if (row.entry?.state === 'uploading') return 'Uploading…';
  if (row.entry?.state === 'error') return 'Failed';
  if (row.entry?.state === 'pending') return 'Selected';
  return row.hasError ? 'Required' : 'Pending';
}

/**
 * The document/status table under a multi-select field — one row per
 * selected document, with its own FILE picker cell, a status badge, and an
 * action that walks Pending -> Uploaded: choosing a file (via the FILE
 * cell's "Select File") enables the ACTION cell's "Upload" button; clicking
 * it uploads that file for real (independent of the page's Save action) and
 * flips status to Uploaded, at which point the action becomes "Edit" —
 * reopening the picker and replacing that row's file in place, same as
 * Report Upload's `ReportUploadTable`. There's no remove.
 * Ported from `_DocumentStatusTable`/`_DocumentRow` (client_information_screen.dart).
 */
export function DocumentStatusTable({
  columnLabel,
  docs,
  files,
  onChooseFile,
  onUpload,
  onPreview,
  missingDocs,
  emptyMessage,
}: DocumentStatusTableProps) {
  if (docs.length === 0) {
    return <p className="text-xs text-text-tertiary">{emptyMessage ?? `No ${columnLabel} selected.`}</p>;
  }

  const rows: DocRow[] = docs.map((doc) => ({ doc, entry: files[doc], hasError: missingDocs?.has(doc) ?? false }));

  const columns: TableColumn<DocRow>[] = [
    {
      key: 'doc',
      header: columnLabel,
      render: (row) => <span className="font-medium text-text-primary">{row.doc}</span>,
    },
    {
      key: 'file',
      header: 'File',
      width: '220px',
      render: (row) => {
        const uploaded = row.entry?.state === 'uploaded';
        const uploading = row.entry?.state === 'uploading';
        return (
          <div className="flex items-center gap-2">
            {!uploaded && (
              <Button variant="secondary" size="sm" onClick={() => onChooseFile(row.doc)} disabled={uploading}>
                Select File
              </Button>
            )}
            <span className="truncate text-xs text-text-tertiary">{row.entry?.file.name ?? 'No file chosen'}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      width: '120px',
      render: (row) => <Badge tone={statusTone(row)}>{statusLabel(row)}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '170px',
      render: (row) => {
        if (!row.entry) {
          return (
            <div className="flex justify-end">
              <Button size="sm" disabled>
                Upload
              </Button>
            </div>
          );
        }
        if (row.entry.state === 'uploaded') {
          return (
            <div className="flex justify-end gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => onPreview(row.doc)}>
                View
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onChooseFile(row.doc)}>
                Edit
              </Button>
            </div>
          );
        }
        const uploading = row.entry.state === 'uploading';
        return (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => onUpload(row.doc)} disabled={uploading}>
              Upload
            </Button>
          </div>
        );
      },
    },
  ];

  return <Table columns={columns} data={rows} rowKey={(row) => row.doc} className="border-divider/70" />;
}
