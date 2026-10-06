import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { isImageFileName } from '../../utils/files';
import { IconClose, IconMaximize, IconMinimize } from '../icons';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface DocumentPreviewModalProps {
  /** `null` keeps the preview closed. */
  label: string | null;
  onClose: () => void;
  /** A just-picked local file — previewed via an object URL. */
  file?: File | null;
  /** An already-uploaded image's remote URL. Falls back to the file card if it fails to load. */
  imageUrl?: string | null;
  /** Name shown on the fallback card when there's no [file] (e.g. a remote PDF). */
  fileName?: string | null;
  /** Remote file URL offered as an "Open in new tab" link on the fallback card. */
  openUrl?: string | null;
}

/**
 * Document preview overlay shared by the Report Upload form (a just-picked
 * `File`) and the View Report screen (an already-uploaded remote URL) — an
 * image gets zoom controls (+/- with a % readout, reset on open) and a
 * full screen / minimize toggle, mirroring the mobile app's preview
 * dialog; anything else falls back to a name/size card. Portaled to
 * `document.body` for the same reason `Modal`/`Drawer` are (a `Card`
 * ancestor's `overflow-hidden` would otherwise clip it, and a page-wrapper
 * animation elsewhere would clip it to less than the full viewport — see
 * those components' own notes).
 */
export function DocumentPreviewModal({ label, onClose, file, imageUrl, fileName, openUrl }: DocumentPreviewModalProps) {
  const open = label !== null;
  const [zoom, setZoom] = useState(1);
  const [fullScreen, setFullScreen] = useState(false);
  const [remoteImageFailed, setRemoteImageFailed] = useState(false);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setFullScreen(false);
      setRemoteImageFailed(false);
    }
  }, [open, file, imageUrl]);

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

  const localIsImage = file ? isImageFileName(file.name) : false;
  const imageSrc = localIsImage ? objectUrl : remoteImageFailed ? null : (imageUrl ?? null);
  const isImage = !!imageSrc;
  const displayName = file?.name ?? fileName ?? 'Preview unavailable';

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
        {/* An image needs a definite-height viewport so "100%" can mean "fit completely"; zoom then grows/shrinks that fitted box. */}
        <div
          className={`overflow-auto bg-surface-variant ${isImage && !fullScreen ? 'h-[60vh]' : 'min-h-0 flex-1'}`}
        >
          {isImage ? (
            <div
              className="flex items-center justify-center p-2"
              style={{
                width: `${Math.max(zoom, 1) * 100}%`,
                height: `${Math.max(zoom, 1) * 100}%`,
                boxSizing: 'border-box',
              }}
            >
              <img
                src={imageSrc}
                alt={label ?? ''}
                onError={() => {
                  if (!localIsImage) setRemoteImageFailed(true);
                }}
                className="rounded-md object-contain transition-all duration-150 ease-out"
                style={{ width: `${Math.min(zoom, 1) * 100}%`, height: `${Math.min(zoom, 1) * 100}%` }}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 px-4 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.6">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6" />
              </svg>
              <p className="truncate text-[12.5px] font-medium text-text-secondary">{displayName}</p>
              {file && <p className="text-[11px] text-text-tertiary">{formatFileSize(file.size)}</p>}
              {!file && openUrl && (
                <a href={openUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
                  Open in new tab
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
