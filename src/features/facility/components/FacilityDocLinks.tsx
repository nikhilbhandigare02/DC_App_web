import { useState } from 'react';
import { DocumentPreviewModal } from '../../../components/ui/DocumentPreviewModal';

interface FacilityDocLinksProps {
  /** Facility name, shown in the preview's title. */
  name: string;
  photoUrl?: string | null;
  videoUrl?: string | null;
  photoName?: string | null;
  videoName?: string | null;
}

/**
 * "View photo" / "View video" for a facility's saved DC photo / video. Opens
 * the shared in-page preview (same as the doctor certificate view) instead of
 * a new browser tab. The wrapper stops click propagation so neither the
 * button nor the portaled preview triggers a clickable parent card/row.
 */
export function FacilityDocLinks({ name, photoUrl, videoUrl, photoName, videoName }: FacilityDocLinksProps) {
  const [preview, setPreview] = useState<'photo' | 'video' | null>(null);
  if (!photoUrl && !videoUrl) return null;

  const link = 'text-xs font-semibold text-primary hover:underline';
  return (
    <span className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
      {photoUrl && (
        <button type="button" onClick={() => setPreview('photo')} className={link}>
          View photo
        </button>
      )}
      {videoUrl && (
        <button type="button" onClick={() => setPreview('video')} className={link}>
          View video
        </button>
      )}
      <DocumentPreviewModal
        label={preview ? `${name} — ${preview}` : null}
        onClose={() => setPreview(null)}
        imageUrl={preview === 'photo' ? photoUrl : null}
        videoUrl={preview === 'video' ? videoUrl : null}
        fileName={preview === 'photo' ? photoName : videoName}
        openUrl={preview === 'photo' ? photoUrl : videoUrl}
      />
    </span>
  );
}
