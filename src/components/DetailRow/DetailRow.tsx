export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-center justify-between gap-4 first:pt-0 py-2.5">
      <span className="shrink-0 text-text-secondary">{label}</span>
      <span className="truncate text-right text-text-primary">{value}</span>
    </div>
  );
}
