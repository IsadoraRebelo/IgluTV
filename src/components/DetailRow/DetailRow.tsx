export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[#8a9bab]">{label}</span>
      <span className="text-[#c2d0dd]">{value}</span>
    </div>
  );
}
