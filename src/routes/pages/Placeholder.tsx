/** Generic placeholder used for every screen not yet built by a feature agent. */
export function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed border-divider bg-surface p-10 text-text-secondary">
      <div className="text-center">
        <p className="text-lg font-semibold text-text-primary">{label}</p>
        <p className="mt-1 text-sm">TODO — screen not yet implemented.</p>
      </div>
    </div>
  );
}
