import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { toast } from '../../lib/toast';
import { GeoTagError, geoTagImage, getCurrentPosition } from '../../utils/geoTag';

type IdProofSource = 'camera' | 'gallery' | 'pdf';

type Step =
  | { kind: 'source'; resolve: (source: IdProofSource | null) => void }
  | { kind: 'camera'; resolve: (blob: Blob | null) => void }
  | { kind: 'confirm'; file: File; resolve: (keep: boolean) => void }
  | null;

function pickLocalFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    // Fires when the dialog is dismissed without choosing anything.
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Live camera view with a Capture button — resolves a JPEG blob of the frame. */
function CameraCaptureModal({ onCapture, onCancel }: { onCapture: (blob: Blob) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser can’t open the camera.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setReady(true);
        }
      } catch {
        setError('Could not open the camera. Check the camera permission.');
      }
    }
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
        else setError('Could not capture the photo.');
      },
      'image/jpeg',
      0.95,
    );
  }

  return (
    <Modal
      open
      onClose={onCancel}
      width={560}
      title="Take photo"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={capture} disabled={!ready || !!error}>
            Capture
          </Button>
        </>
      }
    >
      {error ? (
        <p className="py-8 text-center text-sm font-medium text-error">{error}</p>
      ) : (
        <video ref={videoRef} playsInline muted className="max-h-[60vh] w-full rounded-md bg-black" />
      )}
    </Modal>
  );
}

/** "Keep or discard" step shown right after a capture/pick. */
function ConfirmPreviewModal({ file, onDecide }: { file: File; onDecide: (keep: boolean) => void }) {
  const isImage = file.type.startsWith('image/');
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  return (
    <Modal
      open
      onClose={() => onDecide(false)}
      width={560}
      title="Preview"
      footer={
        <>
          <Button variant="secondary" onClick={() => onDecide(false)}>
            Discard
          </Button>
          <Button onClick={() => onDecide(true)}>Use</Button>
        </>
      }
    >
      {isImage && url ? (
        <img src={url} alt="Preview" className="max-h-[60vh] w-full rounded-md object-contain" />
      ) : (
        <p className="py-8 text-center text-sm font-medium text-text-primary">{file.name}</p>
      )}
    </Modal>
  );
}

/**
 * Picking Client Photo / ID Proof files with geo-tagging, the browser version
 * of the mobile app's `GeoDocumentPicker`:
 *  - Client Photo: camera only, geo-tagged.
 *  - ID Proof: camera or gallery (both geo-tagged) or a PDF (can't be tagged).
 * Every file goes through a "Use / Discard" preview first. Render [pickerUi]
 * once in the component that uses it.
 */
export function useGeoDocumentPicker(): {
  pickClientPhoto: () => Promise<File | null>;
  pickIdProof: () => Promise<File | null>;
  pickerUi: ReactNode;
} {
  const [step, setStep] = useState<Step>(null);

  function ask<T>(make: (resolve: (value: T) => void) => Step): Promise<T> {
    return new Promise<T>((resolve) => {
      setStep(
        make((value) => {
          setStep(null);
          resolve(value);
        }),
      );
    });
  }

  /** Geo-tags [blob] (shows the reason and returns null when it can't). */
  async function tag(blob: Blob): Promise<File | null> {
    try {
      return await geoTagImage(blob);
    } catch (err) {
      toast.error(err instanceof GeoTagError ? err.message : 'Could not geo-tag the photo. Please try again.');
      return null;
    }
  }

  async function ensureLocation(): Promise<boolean> {
    try {
      await getCurrentPosition();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not get your location.');
      return false;
    }
  }

  async function confirm(file: File | null): Promise<File | null> {
    if (!file) return null;
    const keep = await ask<boolean>((resolve) => ({ kind: 'confirm', file, resolve }));
    return keep ? file : null;
  }

  async function captureFromCamera(): Promise<File | null> {
    if (!(await ensureLocation())) return null;
    const blob = await ask<Blob | null>((resolve) => ({ kind: 'camera', resolve }));
    return blob ? tag(blob) : null;
  }

  async function pickClientPhoto(): Promise<File | null> {
    return confirm(await captureFromCamera());
  }

  async function pickIdProof(): Promise<File | null> {
    const source = await ask<IdProofSource | null>((resolve) => ({ kind: 'source', resolve }));
    if (!source) return null;
    let file: File | null = null;
    if (source === 'pdf') {
      file = await pickLocalFile('.pdf,application/pdf');
    } else if (source === 'camera') {
      file = await captureFromCamera();
    } else {
      const picked = await pickLocalFile('image/jpeg,image/png,.jpg,.jpeg,.png');
      if (picked && (await ensureLocation())) file = await tag(picked);
    }
    return confirm(file);
  }

  const pickerUi = (
    <>
      {step?.kind === 'source' && (
        <Modal
          open
          onClose={() => step.resolve(null)}
          width={380}
          title="Add ID Proof"
        >
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={() => step.resolve('camera')}>
              Take photo
            </Button>
            <Button variant="secondary" onClick={() => step.resolve('gallery')}>
              Choose from gallery
            </Button>
            <Button variant="secondary" onClick={() => step.resolve('pdf')}>
              Choose PDF (no geo-tag)
            </Button>
          </div>
        </Modal>
      )}
      {step?.kind === 'camera' && (
        <CameraCaptureModal onCapture={(blob) => step.resolve(blob)} onCancel={() => step.resolve(null)} />
      )}
      {step?.kind === 'confirm' && <ConfirmPreviewModal file={step.file} onDecide={step.resolve} />}
    </>
  );

  return { pickClientPhoto, pickIdProof, pickerUi };
}
