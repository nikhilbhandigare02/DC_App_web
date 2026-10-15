/** Blocking full-screen loader with a message — shown while a long action (upload, geo-tagging) runs. */
export function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="flex items-center gap-3 rounded-lg bg-white px-5 py-4 shadow-lg">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-divider border-t-primary" />
        <span className="text-sm font-medium text-text-primary">{message}</span>
      </div>
    </div>
  );
}
