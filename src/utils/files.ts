/** Whether [fileName] is a previewable image (jpg/jpeg/png) rather than e.g. a PDF. */
export function isImageFileName(fileName: string | null | undefined): boolean {
  return /\.(jpg|jpeg|png)$/i.test(fileName ?? '');
}
