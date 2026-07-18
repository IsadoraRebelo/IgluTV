export function StatTile({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex flex-col items-center rounded-md bg-white/[0.03] py-3 text-center">
      <span className="text-accent text-2xl font-semibold">{value}</span>
      <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}
