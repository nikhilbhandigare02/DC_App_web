/** Whether [fileName] is a previewable image (jpg/jpeg/png) rather than e.g. a PDF. */
export function isImageFileName(fileName: string | null | undefined): boolean {
  return /\.(jpg|jpeg|png)$/i.test(fileName ?? '');
}

/** The two server folders documents are served from — files uploaded by the DC portal vs. the older upload service. */
const DOC_BASES = ['/ReportUploadDoc/', '/HealthSphere360_ReportUpload/'];

/**
 * Candidate URLs to try for a stored document path, best first: the URL with
 * backslashes turned into slashes and special characters escaped, then the same
 * path under the other document folder (a document can live under either one).
 */
export function documentUrlCandidates(url: string | null | undefined): string[] {
  if (!url) return [];
  let normalized = url.trim().replace(/\\/g, '/');
  try {
    normalized = encodeURI(decodeURI(normalized));
  } catch {
    // Keep it as-is if it isn't valid percent-encoding.
  }
  const candidates = [normalized];
  const current = DOC_BASES.find((base) => normalized.includes(base));
  if (current) {
    for (const base of DOC_BASES) {
      if (base !== current) candidates.push(normalized.replace(current, base));
    }
  }
  return candidates;
}
